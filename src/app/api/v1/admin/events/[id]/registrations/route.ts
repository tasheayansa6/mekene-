import { z } from 'zod';
import { db } from '@/lib/db';
import {
  error,
  forbidden,
  notFound,
  paginated,
  success,
  validationError,
} from '@/lib/api/response';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { formatZodErrors } from '@/lib/auth/validation';
import { readJson } from '@/lib/auth/http';
import {
  canManageRegistrations,
  canMutateEventRecord,
} from '@/lib/events/registration-access';
import {
  RegistrationError,
  getEventCapacityStats,
  registerForEvent,
} from '@/lib/events/registration';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await guardAdminRead(request, 'events', 'view');
  if (!auth.ok) return auth.error;
  if (!canManageRegistrations(auth.user)) return forbidden();

  const { id } = await context.params;
  const event = await db.event.findUnique({
    where: { id },
    include: { ministry: { select: { leaderUserId: true } } },
  });
  if (!event) return notFound('Event');
  if (!canMutateEventRecord(auth.user, event)) return forbidden();

  const url = new URL(request.url);
  const status = url.searchParams.get('status') || undefined;
  const q = url.searchParams.get('q')?.trim() || '';
  const page = Math.max(1, Number(url.searchParams.get('page') || 1));
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize') || 20)));

  const where = {
    eventId: id,
    ...(status
      ? {
          status: status as
            | 'registered'
            | 'waitlisted'
            | 'confirmed'
            | 'cancelled'
            | 'attended'
            | 'no_show',
        }
      : {}),
    ...(q
      ? {
          OR: [
            { reference: { contains: q } },
            { guestName: { contains: q } },
            { guestEmail: { contains: q } },
            { user: { email: { contains: q } } },
            { user: { firstName: { contains: q } } },
            { user: { lastName: { contains: q } } },
          ],
        }
      : {}),
  };

  const [totalItems, rows, capacity] = await Promise.all([
    db.eventRegistration.count({ where }),
    db.eventRegistration.findMany({
      where,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { registeredAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    getEventCapacityStats(id, event.capacity),
  ]);

  return paginated(
    rows.map((row) => ({
      id: row.id,
      reference: row.reference,
      status: row.status,
      waitlistPosition: row.waitlistPosition,
      registeredAt: row.registeredAt.toISOString(),
      cancelledAt: row.cancelledAt?.toISOString() ?? null,
      guestName: row.guestName,
      guestEmail: row.guestEmail,
      guestPartySize: row.guestPartySize,
      user: row.user
        ? {
            id: row.user.id,
            name: `${row.user.firstName} ${row.user.lastName}`.trim(),
            email: row.user.email,
          }
        : null,
    })),
    { page, pageSize, totalItems },
    { capacity }
  );
}

const schema = z.object({
  userId: z.string().min(1),
  notes: z.string().trim().max(500).optional(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await guardAdminWrite(request, 'events', 'assign');
  if (!auth.ok) return auth.error;
  if (!canManageRegistrations(auth.user)) return forbidden();

  const { id } = await context.params;
  const event = await db.event.findUnique({
    where: { id },
    include: { ministry: { select: { leaderUserId: true } } },
  });
  if (!event) return notFound('Event');
  if (!canMutateEventRecord(auth.user, event)) return forbidden();

  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const user = await db.user.findUnique({
    where: { id: parsed.data.userId },
    select: { id: true },
  });
  if (!user) return validationError({ userId: ['Member user not found.'] });

  try {
    const registration = await registerForEvent({
      eventId: event.id,
      userId: user.id,
      notes: parsed.data.notes,
      recordedById: auth.user.id,
      request,
    });
    return success(
      {
        registration: {
          id: registration.id,
          reference: registration.reference,
          status: registration.status,
        },
      },
      'Member registered.',
      201
    );
  } catch (err) {
    if (err instanceof RegistrationError) {
      return error(err.message, 400);
    }
    throw err;
  }
}
