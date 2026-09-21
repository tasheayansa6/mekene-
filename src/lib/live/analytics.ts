import { db } from '@/lib/db';

export async function getLiveAnalyticsOverview() {
  const now = new Date();
  const [liveNow, scheduled, endedRecent, totalSessions] = await Promise.all([
    db.liveSession.count({ where: { status: 'live' } }),
    db.liveSession.count({
      where: { status: 'scheduled', scheduledStartAt: { gte: now } },
    }),
    db.liveSession.count({
      where: { status: 'ended', actualEndedAt: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } },
    }),
    db.liveSession.count(),
  ]);

  return { liveNow, scheduled, endedRecent, totalSessions };
}

export async function getLiveSessionReport(sessionId: string) {
  const session = await db.liveSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      scheduledStartAt: true,
      actualStartedAt: true,
      actualEndedAt: true,
      peakViewers: true,
      approximateViewers: true,
    },
  });
  if (!session) return null;

  const [attendanceCount, chatCount, prayerCount, reactionCount] = await Promise.all([
    db.liveAttendance.count({ where: { liveSessionId: sessionId } }),
    db.liveChatMessage.count({
      where: { liveSessionId: sessionId, status: { not: 'deleted' } },
    }),
    db.livePrayerRequest.count({ where: { liveSessionId: sessionId } }),
    db.liveReaction.count({ where: { liveSessionId: sessionId } }),
  ]);

  return {
    session: {
      id: session.id,
      title: session.title,
      slug: session.slug,
      status: session.status,
      scheduledStartAt: session.scheduledStartAt.toISOString(),
      actualStartedAt: session.actualStartedAt?.toISOString() ?? null,
      actualEndedAt: session.actualEndedAt?.toISOString() ?? null,
    },
    metrics: {
      attendanceCount,
      chatCount,
      prayerCount,
      reactionCount,
      peakViewers: session.peakViewers,
      approximateViewers: session.approximateViewers,
    },
  };
}
