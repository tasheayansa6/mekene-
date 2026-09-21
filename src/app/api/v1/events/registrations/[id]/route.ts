import { db } from '@/lib/db';
import { forbidden, notFound, success } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';
import { getEventCapacityStats } from '@/lib/events/registration';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const { id } = await context.params;
  const row = await db.eventRegistration.findUnique({
    where: { id },
    include: {
      event: {
        select: {
          id: true,
          title: true,
          slug: true,
          startAt: true,
          endAt: true,
          timezone: true,
          status: true,
          capacity: true,
          locationVisibility: true,
          meetingUrl: true,
          isOnline: true,
          isHybrid: true,
          location: { select: { name: true, address: true } },
        },
      },
    },
  });

  if (!row) return notFound('Registration');
  if (row.userId !== auth.user.id) return forbidden();

  const capacity = await getEventCapacityStats(row.eventId, row.event.capacity);
  const showLocation =
    row.event.locationVisibility === 'public' || row.event.locationVisibility === 'members';
  const showMeeting =
    (row.event.isOnline || row.event.isHybrid) &&
    row.status !== 'cancelled' &&
    (row.event.locationVisibility !== 'private' || row.status === 'registered' || row.status === 'confirmed');

  return success({
    registration: {
      id: row.id,
      reference: row.reference,
      status: row.status,
      registeredAt: row.registeredAt.toISOString(),
      cancelledAt: row.cancelledAt?.toISOString() ?? null,
      waitlistPosition: row.waitlistPosition,
      event: {
        id: row.event.id,
        title: row.event.title,
        slug: row.event.slug,
        startAt: row.event.startAt.toISOString(),
        endAt: row.event.endAt.toISOString(),
        timezone: row.event.timezone,
        status: row.event.status,
        locationName: showLocation ? row.event.location?.name ?? null : null,
        locationAddress: showLocation ? row.event.location?.address ?? null : null,
        meetingUrl: showMeeting ? row.event.meetingUrl : null,
      },
      capacity,
    },
  });
}
