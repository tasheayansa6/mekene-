import { db } from '@/lib/db';
import { error, forbidden, notFound, success, validationError } from '@/lib/api/response';
import { readJson } from '@/lib/auth/http';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import {
  canArchiveEvent,
  canCancelEvent,
  canDeleteEvent,
  canMutateEventRecord,
  canPublishEvent,
  eventWhereForUser,
  RESERVED_EVENT_SLUGS,
} from '@/lib/events/access';
import {
  enforceFeaturedLimit,
  eventForEventStatus,
  logContentChange,
  revalidatePublicContent,
  uniqueContentSlug,
} from '@/lib/content/admin-write';
import { churchTimezone } from '@/lib/events/public';
import { eventInclude, serializeEvent } from '@/lib/events/serialize';
import { eventWriteSchema, formatZodErrors } from '@/lib/events/validation';
import { prepareEventFields, resolveMinistryForWrite } from '@/lib/events/write';
import { validateEventScheduling } from '@/lib/events/conflicts';
import { recordEventChanges } from '@/lib/events/history';

type RouteContext = { params: Promise<{ id: string }> };

async function loadEvent(id: string, user: Parameters<typeof eventWhereForUser>[0]) {
  const scoped = eventWhereForUser(user);
  return db.event.findFirst({
    where: scoped ? { AND: [{ id }, scoped] } : { id },
    include: eventInclude,
  });
}

export async function GET(request: Request, context: RouteContext) {
  const auth = await guardAdminRead(request, 'events', 'view');
  if (!auth.ok) return auth.error;
  const { id } = await context.params;
  const row = await loadEvent(id, auth.user);
  if (!row) return notFound('Event');
  return success(serializeEvent(row));
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await guardAdminWrite(request, 'events', 'update');
  if (!auth.ok) return auth.error;
  const { id } = await context.params;
  const parsed = eventWriteSchema.partial().safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));
  const existing = await loadEvent(id, auth.user);
  if (!existing) return notFound('Event');
  if (!canMutateEventRecord(auth.user, existing)) return forbidden();
  const data = parsed.data;
  if (data.slug && RESERVED_EVENT_SLUGS.has(data.slug)) {
    return error('That slug is reserved.', 409);
  }
  if ((data.status === 'published' || data.status === 'scheduled') && !canPublishEvent(auth.user)) {
    return forbidden('You do not have permission to publish events.');
  }
  if (data.status === 'archived' && !canArchiveEvent(auth.user)) return forbidden();
  if (data.status === 'cancelled' && !canCancelEvent(auth.user)) {
    return forbidden('You do not have permission to cancel events.');
  }
  const ministry = await resolveMinistryForWrite(
    auth.user,
    data.ministryId !== undefined ? data.ministryId : existing.ministryId
  );
  if (!ministry.ok) return forbidden(ministry.error);
  const prepared = prepareEventFields(data, {
    user: auth.user,
    existing: {
      startAt: existing.startAt,
      endAt: existing.endAt,
      timezone: existing.timezone,
      status: existing.status,
      publishAt: existing.publishAt,
    },
    defaultTimezone: await churchTimezone(),
  });
  if (!prepared.ok) return validationError(prepared.errors);
  const nextStartAt = (prepared.fields.startAt as Date | undefined) ?? existing.startAt;
  const nextEndAt = (prepared.fields.endAt as Date | undefined) ?? existing.endAt;
  const nextLocationId =
    prepared.fields.locationId !== undefined
      ? (prepared.fields.locationId as string | null)
      : existing.locationId;
  const nextCapacity =
    prepared.fields.capacity !== undefined
      ? (prepared.fields.capacity as number | null)
      : existing.capacity;
  const nextAllowOver =
    prepared.fields.allowOverVenueCapacity !== undefined
      ? Boolean(prepared.fields.allowOverVenueCapacity)
      : existing.allowOverVenueCapacity;
  const scheduling = await validateEventScheduling({
    locationId: nextLocationId,
    startAt: nextStartAt,
    endAt: nextEndAt,
    capacity: nextCapacity,
    allowOverVenueCapacity: nextAllowOver,
    excludeEventId: id,
    allowVenueConflict: data.allowVenueConflict,
  });
  if (!scheduling.ok) {
    return validationError({
      scheduling: scheduling.errors.map((c) => c.message),
    });
  }
  const slug =
    data.title || data.slug
      ? await uniqueContentSlug('event', data.title || existing.title, data.slug, id)
      : existing.slug;
  const updated = await db.event.update({
    where: { id },
    data: {
      ...prepared.fields,
      slug,
      ministryId: ministry.ministryId,
    },
    include: eventInclude,
  });
  if (updated.isFeatured) await enforceFeaturedLimit('event', updated.id);
  await recordEventChanges({
    eventId: id,
    before: existing as unknown as Record<string, unknown>,
    after: updated as unknown as Record<string, unknown>,
    changedById: auth.user.id,
  });
  if (existing.status !== 'published' && updated.status === 'published') {
    const { scheduleEventReminders } = await import('@/lib/communications/event-reminders');
    const { parseReminderOffsets } = await import('@/lib/events/registration');
    const offsets = parseReminderOffsets(updated.reminderOffsetsMinutes);
    await scheduleEventReminders({
      eventId: updated.id,
      title: updated.title,
      startAt: updated.startAt,
      reminderOffsetsMinutes: offsets,
      createdById: auth.user.id,
      relatedUrl: `/events/${updated.slug}`,
    });
  }
  await logContentChange({
    type: eventForEventStatus(existing.status, updated.status),
    entity: 'event',
    entityId: updated.id,
    userId: auth.user.id,
    request,
    details: { slug: updated.slug, status: updated.status },
  });
  revalidatePublicContent([`/events/${updated.slug}`, `/events/${existing.slug}`, '/events/past']);
  return success(
    { ...serializeEvent(updated), schedulingWarnings: scheduling.warnings },
    'Event updated.'
  );
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await guardAdminWrite(request, 'events', 'archive');
  if (!auth.ok) return auth.error;
  if (!canArchiveEvent(auth.user) && !canDeleteEvent(auth.user)) return forbidden();
  const { id } = await context.params;
  const existing = await loadEvent(id, auth.user);
  if (!existing) return notFound('Event');
  if (!canMutateEventRecord(auth.user, existing)) return forbidden();
  const updated = await db.event.update({
    where: { id },
    data: { status: 'archived', isFeatured: false },
    include: eventInclude,
  });
  await logContentChange({
    type: 'event.archived',
    entity: 'event',
    entityId: id,
    userId: auth.user.id,
    request,
    details: { slug: existing.slug },
  });
  revalidatePublicContent([`/events/${existing.slug}`, '/events/past']);
  return success(serializeEvent(updated), 'Event archived.');
}
