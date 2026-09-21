import { db } from '@/lib/db';
import { forbidden, notFound } from '@/lib/api/response';
import { guardAdminRead } from '@/lib/admin/guard';
import {
  canExportEvents,
  canMutateEventRecord,
} from '@/lib/events/registration-access';
import { emitEventLifecycle } from '@/lib/events/lifecycle';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await guardAdminRead(request, 'events', 'manage');
  if (!auth.ok) return auth.error;
  if (!canExportEvents(auth.user)) return forbidden();

  const { id } = await context.params;
  const event = await db.event.findUnique({
    where: { id },
    include: { ministry: { select: { leaderUserId: true } } },
  });
  if (!event) return notFound('Event');
  if (!canMutateEventRecord(auth.user, event)) return forbidden();

  const rows = await db.eventRegistration.findMany({
    where: { eventId: id },
    include: {
      user: { select: { firstName: true, lastName: true, email: true } },
    },
    orderBy: { registeredAt: 'asc' },
    take: 5000,
  });

  await emitEventLifecycle({
    type: 'event.exported',
    userId: auth.user.id,
    entityId: id,
    request,
    details: { count: rows.length },
  });

  const header = [
    'reference',
    'status',
    'registered_at',
    'name',
    'email',
    'guest_party_size',
    'waitlist_position',
  ];
  const lines = [
    header.join(','),
    ...rows.map((row) => {
      const name = row.user
        ? `${row.user.firstName} ${row.user.lastName}`.trim()
        : row.guestName || '';
      const email = row.user?.email || row.guestEmail || '';
      return [
        row.reference,
        row.status,
        row.registeredAt.toISOString(),
        csv(name),
        csv(email),
        String(row.guestPartySize),
        row.waitlistPosition ?? '',
      ].join(',');
    }),
  ];

  return new Response(lines.join('\n'), {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="event-${event.slug}-registrations.csv"`,
    },
  });
}

function csv(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}
