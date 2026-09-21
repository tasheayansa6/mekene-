import { db } from '@/lib/db';
import { error, forbidden, notFound, success, validationError } from '@/lib/api/response';
import { readJson } from '@/lib/auth/http';
import { guardAdminWrite } from '@/lib/admin/guard';
import { canDeleteEvent } from '@/lib/events/access';
import { logContentChange, sanitizePlainText, uniqueContentSlug } from '@/lib/content/admin-write';
import { eventCategoryWriteSchema, formatZodErrors } from '@/lib/events/validation';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await guardAdminWrite(request, 'events', 'update');
  if (!auth.ok) return auth.error;
  const { id } = await context.params;
  const parsed = eventCategoryWriteSchema.partial().safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));
  const existing = await db.eventCategory.findUnique({ where: { id } });
  if (!existing) return notFound('Category');
  const slug =
    parsed.data.name || parsed.data.slug
      ? await uniqueContentSlug('eventCategory', parsed.data.name || existing.name, parsed.data.slug, id)
      : existing.slug;
  const clash = await db.eventCategory.findFirst({ where: { slug, id: { not: id } } });
  if (clash) return error('A category with this slug already exists.', 409);
  const updated = await db.eventCategory.update({
    where: { id },
    data: {
      name: parsed.data.name ? sanitizePlainText(parsed.data.name, 80) : undefined,
      slug,
      description:
        parsed.data.description === undefined
          ? undefined
          : parsed.data.description
            ? sanitizePlainText(parsed.data.description, 400)
            : null,
      sortOrder: parsed.data.sortOrder,
    },
  });
  await logContentChange({
    type: 'event.updated',
    entity: 'event_category',
    entityId: id,
    userId: auth.user.id,
    request,
    details: { name: updated.name },
  });
  return success(updated, 'Category updated.');
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await guardAdminWrite(request, 'events', 'delete');
  if (!auth.ok) return auth.error;
  if (!canDeleteEvent(auth.user)) return forbidden();
  const { id } = await context.params;
  const existing = await db.eventCategory.findUnique({
    where: { id },
    include: { _count: { select: { events: true } } },
  });
  if (!existing) return notFound('Category');
  if (existing._count.events > 0) {
    return error('Remove this category from events before deleting it.', 409);
  }
  await db.eventCategory.delete({ where: { id } });
  await logContentChange({
    type: 'event.deleted',
    entity: 'event_category',
    entityId: id,
    userId: auth.user.id,
    request,
    details: { name: existing.name },
  });
  return success({ id }, 'Category deleted.');
}
