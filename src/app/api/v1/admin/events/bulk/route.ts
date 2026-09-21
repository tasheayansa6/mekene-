import { db } from '@/lib/db';
import { forbidden, success, validationError } from '@/lib/api/response';
import { readJson } from '@/lib/auth/http';
import { guardAdminWrite } from '@/lib/admin/guard';
import { canArchiveEvent, canCancelEvent, canPublishEvent, eventWhereForUser } from '@/lib/events/access';
import { logContentChange, revalidatePublicContent } from '@/lib/content/admin-write';
import { eventActionSchema, formatZodErrors } from '@/lib/events/validation';
import { resolveEventStatusOnSave } from '@/lib/events/status';

export async function POST(request: Request) {
  const auth = await guardAdminWrite(request, 'events', 'update');
  if (!auth.ok) return auth.error;
  const parsed = eventActionSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));
  const { action, ids } = parsed.data;
  if (action === 'publish' && !canPublishEvent(auth.user)) {
    return forbidden('You do not have permission to publish events.');
  }
  if (action === 'archive' && !canArchiveEvent(auth.user)) return forbidden();
  if (action === 'cancel' && !canCancelEvent(auth.user)) {
    return forbidden('You do not have permission to cancel events.');
  }
  const scoped = eventWhereForUser(auth.user);
  const where = scoped ? { id: { in: ids }, AND: [scoped] } : { id: { in: ids } };
  const now = new Date();
  if (action === 'publish') {
    const resolved = resolveEventStatusOnSave({ status: 'published', publishAt: now });
    await db.event.updateMany({
      where,
      data: { status: resolved.status, publishAt: now, publishedAt: resolved.publishedAt },
    });
  } else if (action === 'unpublish') {
    await db.event.updateMany({
      where,
      data: { status: 'draft', publishedAt: null, isFeatured: false },
    });
  } else if (action === 'cancel') {
    await db.event.updateMany({
      where,
      data: { status: 'cancelled', isFeatured: false },
    });
  } else if (action === 'complete') {
    await db.event.updateMany({
      where,
      data: { status: 'completed', isFeatured: false },
    });
  } else {
    await db.event.updateMany({
      where,
      data: { status: 'archived', isFeatured: false },
    });
  }
  await logContentChange({
    type:
      action === 'publish'
        ? 'event.published'
        : action === 'unpublish'
          ? 'event.unpublished'
          : action === 'cancel'
            ? 'event.cancelled'
            : 'event.archived',
    entity: 'event',
    entityId: ids[0],
    userId: auth.user.id,
    request,
    details: { ids, action, count: ids.length },
  });
  revalidatePublicContent(['/events/past']);
  return success({ updated: ids.length }, 'Bulk action completed.');
}
