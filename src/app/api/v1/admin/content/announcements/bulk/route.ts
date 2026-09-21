import { db } from '@/lib/db';
import { forbidden, success, validationError } from '@/lib/api/response';
import { readJson } from '@/lib/auth/http';
import { guardAdminWrite } from '@/lib/admin/guard';
import { canArchiveContent, canDeleteContent, canPublishContent } from '@/lib/content/access';
import { logContentChange, revalidatePublicContent } from '@/lib/content/admin-write';
import { contentActionSchema, formatZodErrors } from '@/lib/content/validation';
import { resolveStatusOnSave } from '@/lib/content/status';

export async function POST(request: Request) {
  const auth = await guardAdminWrite(request, 'content', 'update');
  if (!auth.ok) return auth.error;
  const parsed = contentActionSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));
  const { action, ids, publishAt } = parsed.data;
  if ((action === 'publish' || action === 'schedule') && !canPublishContent(auth.user)) {
    return forbidden('You do not have permission to publish content.');
  }
  if (action === 'archive' && !canArchiveContent(auth.user)) return forbidden();
  if (action === 'delete' && !canDeleteContent(auth.user)) return forbidden();
  const now = new Date();
  if (action === 'publish') {
    const resolved = resolveStatusOnSave({
      status: 'published',
      publishAt: publishAt ? new Date(publishAt) : now,
    });
    await db.announcement.updateMany({
      where: { id: { in: ids } },
      data: {
        status: resolved.status,
        publishAt: publishAt ? new Date(publishAt) : now,
        publishedAt: resolved.publishedAt,
      },
    });
  } else if (action === 'unpublish') {
    await db.announcement.updateMany({
      where: { id: { in: ids } },
      data: { status: 'draft', publishedAt: null, isFeatured: false },
    });
  } else {
    await db.announcement.updateMany({
      where: { id: { in: ids } },
      data: { status: 'archived', isFeatured: false },
    });
  }
  await logContentChange({
    type:
      action === 'publish'
        ? 'content.published'
        : action === 'unpublish'
          ? 'content.unpublished'
          : 'content.archived',
    entity: 'announcement',
    entityId: ids[0],
    userId: auth.user.id,
    request,
    details: { ids, action, count: ids.length },
  });
  revalidatePublicContent();
  return success({ updated: ids.length }, 'Bulk action completed.');
}
