import { db } from '@/lib/db';
import { error, forbidden, notFound, success, validationError } from '@/lib/api/response';
import { readJson } from '@/lib/auth/http';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { canMutateEventRecord, eventWhereForUser } from '@/lib/events/access';
import { formatZodErrors, resourceReservationSchema } from '@/lib/events/validation';
import { listEventReservations, reserveResource, ReservationError } from '@/lib/events/resources';
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

  const rows = await listEventReservations(id);
  return success(
    rows.map((row) => ({
      id: row.id,
      resourceId: row.resourceId,
      resource: row.resource,
      quantity: row.quantity,
      startAt: row.startAt.toISOString(),
      endAt: row.endAt.toISOString(),
      status: row.status,
      notes: row.notes,
    }))
  );
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await guardAdminWrite(request, 'events', 'update');
  if (!auth.ok) return auth.error;
  const { id } = await context.params;
  const event = await loadEvent(id, auth.user);
  if (!event) return notFound('Event');
  if (!canMutateEventRecord(auth.user, event)) return forbidden();

  const parsed = resourceReservationSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const tz = event.timezone || (await churchTimezone());
  const startAt = parseEventDateTime(parsed.data.startAt, tz);
  const endAt = parseEventDateTime(parsed.data.endAt, tz);
  if (!startAt || !endAt) {
    return validationError({ startAt: ['Invalid reservation window.'] });
  }

  try {
    const row = await reserveResource({
      resourceId: parsed.data.resourceId,
      eventId: id,
      quantity: parsed.data.quantity,
      startAt: startAt < event.startAt ? event.startAt : startAt,
      endAt: endAt > event.endAt ? event.endAt : endAt,
      notes: parsed.data.notes,
      createdById: auth.user.id,
      request,
    });
    return success(row, 'Resource reserved.', 201);
  } catch (err) {
    if (err instanceof ReservationError) {
      return error(err.message, err.code === 'conflict' ? 409 : 400);
    }
    throw err;
  }
}
