import { db } from '@/lib/db';
import { success } from '@/lib/api/response';
import { optionalAuth } from '@/lib/auth/authorize';
import { DAY_ORDER } from '@/app/api/v1/church/_lib/validation';
import { publicEventStatusWhere } from '@/lib/events/status';
import { eventInclude, serializeEvent } from '@/lib/events/serialize';
import { getLiveBadgeForEvent } from '@/lib/live/public';

export async function GET(request: Request) {
  const { user } = await optionalAuth(request);
  const now = new Date();

  const profile = await db.churchProfile.findFirst({
    where: { isActive: true, status: 'published' },
    select: { id: true },
  });

  const schedules = profile
    ? await db.serviceSchedule.findMany({
        where: { churchProfileId: profile.id, isActive: true },
        orderBy: [{ sortOrder: 'asc' }],
      })
    : [];

  const sortedSchedules = [...schedules].sort(
    (a, b) => (DAY_ORDER[a.dayOfWeek] ?? 99) - (DAY_ORDER[b.dayOfWeek] ?? 99)
  );

  const worshipEvents = await db.event.findMany({
    where: {
      AND: [
        publicEventStatusWhere(now),
        { isWorshipService: true },
        { endAt: { gte: now } },
        { status: { notIn: ['completed', 'archived', 'cancelled'] } },
      ],
    },
    include: eventInclude,
    orderBy: { startAt: 'asc' },
    take: 8,
  });

  const eventsWithBadges = await Promise.all(
    worshipEvents.map(async (event) => ({
      ...serializeEvent(event, { isAuthenticated: Boolean(user) }),
      live: await getLiveBadgeForEvent(event.id, user),
    }))
  );

  return success({
    schedules: sortedSchedules,
    upcomingWorshipEvents: eventsWithBadges,
  });
}
