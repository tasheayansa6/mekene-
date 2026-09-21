import { db } from '@/lib/db';
import { error, forbidden, notFound, success, validationError } from '@/lib/api/response';
import { readJson } from '@/lib/auth/http';
import { guardAdminWrite } from '@/lib/admin/guard';
import { canDeleteEvent } from '@/lib/events/access';
import {
  logContentChange,
  sanitizeOptionalUrl,
  sanitizePlainText,
  uniqueContentSlug,
  unsafeUrlError,
} from '@/lib/content/admin-write';
import { eventLocationWriteSchema, formatZodErrors } from '@/lib/events/validation';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await guardAdminWrite(request, 'events', 'update');
  if (!auth.ok) return auth.error;
  const { id } = await context.params;
  const parsed = eventLocationWriteSchema.partial().safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));
  const existing = await db.eventLocation.findUnique({ where: { id } });
  if (!existing) return notFound('Location');
  try {
    if (parsed.data.mapUrl !== undefined) sanitizeOptionalUrl(parsed.data.mapUrl);
  } catch {
    return unsafeUrlError();
  }
  const slug =
    parsed.data.name || parsed.data.slug
      ? await uniqueContentSlug('eventLocation', parsed.data.name || existing.name, parsed.data.slug, id)
      : existing.slug;
  const clash = await db.eventLocation.findFirst({ where: { slug, id: { not: id } } });
  if (clash) return error('A location with this slug already exists.', 409);
  const updated = await db.eventLocation.update({
    where: { id },
    data: {
      name: parsed.data.name ? sanitizePlainText(parsed.data.name, 120) : undefined,
      slug,
      address:
        parsed.data.address === undefined
          ? undefined
          : parsed.data.address
            ? sanitizePlainText(parsed.data.address, 240)
            : null,
      description:
        parsed.data.description === undefined
          ? undefined
          : parsed.data.description
            ? sanitizePlainText(parsed.data.description, 400)
            : null,
      latitude: parsed.data.latitude === undefined ? undefined : parsed.data.latitude,
      longitude: parsed.data.longitude === undefined ? undefined : parsed.data.longitude,
      mapUrl: parsed.data.mapUrl === undefined ? undefined : sanitizeOptionalUrl(parsed.data.mapUrl),
      capacity: parsed.data.capacity === undefined ? undefined : parsed.data.capacity,
      facilities:
        parsed.data.facilities === undefined
          ? undefined
          : parsed.data.facilities
            ? sanitizePlainText(parsed.data.facilities, 1000)
            : null,
      isActive: parsed.data.isActive,
    },
  });
  await logContentChange({
    type: 'event.updated',
    entity: 'event_location',
    entityId: id,
    userId: auth.user.id,
    request,
    details: { name: updated.name },
  });
  return success(updated, 'Location updated.');
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await guardAdminWrite(request, 'events', 'delete');
  if (!auth.ok) return auth.error;
  if (!canDeleteEvent(auth.user)) return forbidden();
  const { id } = await context.params;
  const existing = await db.eventLocation.findUnique({
    where: { id },
    include: { _count: { select: { events: true } } },
  });
  if (!existing) return notFound('Location');
  if (existing._count.events > 0) {
    return error('Remove this location from events before deleting it.', 409);
  }
  await db.eventLocation.delete({ where: { id } });
  await logContentChange({
    type: 'event.deleted',
    entity: 'event_location',
    entityId: id,
    userId: auth.user.id,
    request,
    details: { name: existing.name },
  });
  return success({ id }, 'Location deleted.');
}
