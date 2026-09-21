import { db } from '@/lib/db';
import { error, forbidden, notFound, success, validationError } from '@/lib/api/response';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { canMutateEventRecord } from '@/lib/events/access';
import { eventWhereForUser } from '@/lib/events/access';
import { validateEventScheduling } from '@/lib/events/conflicts';
import { eventConflictQuerySchema, formatZodErrors } from '@/lib/events/validation';
import { parseEventDateTime } from '@/lib/events/timezone';
import { churchTimezone } from '@/lib/events/public';

type RouteContext = { params: Promise<{ id: string }> };

async function loadEvent(id: string, user: Parameters<typeof eventWhereForUser>[0]) {
  const scoped = eventWhereForUser(user);
  return db.event.findFirst({
    where: scoped ? { AND: [{ id }, scoped] } : { id },
  });
}

export async function GET(request: Request, context: RouteContext) {
  const auth = await guardAdminRead(request, 'events', 'view');
  if (!auth.ok) return auth.error;
  const { id } = await context.params;
  const event = await loadEvent(id, auth.user);
  if (!event) return notFound('Event');
  if (!canMutateEventRecord(auth.user, event)) return forbidden();

  const url = new URL(request.url);
  const parsed = eventConflictQuerySchema.safeParse({
    locationId: url.searchParams.get('locationId') || event.locationId || undefined,
    startAt: url.searchParams.get('startAt') || event.startAt.toISOString(),
    endAt: url.searchParams.get('endAt') || event.endAt.toISOString(),
    capacity: url.searchParams.get('capacity') ?? event.capacity,
    allowOverVenueCapacity: url.searchParams.get('allowOverVenueCapacity') || undefined,
  });
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const tz = event.timezone || (await churchTimezone());
  const startAt = parseEventDateTime(parsed.data.startAt, tz) || event.startAt;
  const endAt = parseEventDateTime(parsed.data.endAt, tz) || event.endAt;
  const result = await validateEventScheduling({
    locationId: parsed.data.locationId || event.locationId,
    startAt,
    endAt,
    capacity: parsed.data.capacity ?? event.capacity,
    allowOverVenueCapacity: parsed.data.allowOverVenueCapacity === 'true' || event.allowOverVenueCapacity,
    excludeEventId: id,
  });

  if (!result.ok) {
    return success({ ok: false, conflicts: result.errors });
  }
  return success({ ok: true, warnings: result.warnings });
}
