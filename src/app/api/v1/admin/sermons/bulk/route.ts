import { db } from '@/lib/db';
import { forbidden, success, validationError } from '@/lib/api/response';
import { readJson } from '@/lib/auth/http';
import { guardAdminWrite } from '@/lib/admin/guard';
import { canArchiveSermon, canDeleteSermon, canPublishSermon } from '@/lib/sermons/access';
import { logContentChange, revalidatePublicContent } from '@/lib/content/admin-write';
import { formatZodErrors, sermonActionSchema } from '@/lib/sermons/validation';
import { resolveStatusOnSave } from '@/lib/content/status';

export async function POST(request: Request) {
  const auth = await guardAdminWrite(request, 'sermons', 'update');
  if (!auth.ok) return auth.error;
  const parsed = sermonActionSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));
  const { action, ids, publishAt } = parsed.data;
  if (action === 'publish' && !canPublishSermon(auth.user)) {
    return forbidden('You do not have permission to publish sermons.');
  }
  if (action === 'archive' && !canArchiveSermon(auth.user)) return forbidden();
  if (action === 'delete' && !canDeleteSermon(auth.user)) return forbidden();
  const now = new Date();
  if (action === 'publish') {
    const resolved = resolveStatusOnSave({
      status: 'published',
      publishAt: publishAt ? new Date(publishAt) : now,
    });
    await db.sermon.updateMany({
      where: { id: { in: ids } },
      data: {
        status: resolved.status,
        publishAt: publishAt ? new Date(publishAt) : now,
        publishedAt: resolved.publishedAt,
      },
    });
  } else if (action === 'unpublish') {
    await db.sermon.updateMany({
      where: { id: { in: ids } },
      data: { status: 'draft', publishedAt: null, isFeatured: false },
    });
  } else {
    await db.sermon.updateMany({
      where: { id: { in: ids } },
      data: { status: 'archived', isFeatured: false },
    });
  }
  await logContentChange({
    type:
      action === 'publish'
        ? 'sermon.published'
        : action === 'unpublish'
          ? 'sermon.unpublished'
          : 'sermon.archived',
    entity: 'sermon',
    entityId: ids[0],
    userId: auth.user.id,
    request,
    details: { ids, action, count: ids.length },
  });
  revalidatePublicContent();
  return success({ updated: ids.length }, 'Bulk action completed.');
}
