import { db } from '@/lib/db';

export async function bumpApproximateViewers(sessionId: string) {
  const session = await db.liveSession.findUnique({
    where: { id: sessionId },
    select: { id: true, approximateViewers: true, peakViewers: true, status: true },
  });
  if (!session) return null;
  if (session.status !== 'live' && session.status !== 'paused') {
    return { approximateViewers: session.approximateViewers, peakViewers: session.peakViewers };
  }

  const nextApproximate = session.approximateViewers + 1;
  const nextPeak = Math.max(session.peakViewers, nextApproximate);

  const updated = await db.liveSession.update({
    where: { id: sessionId },
    data: {
      approximateViewers: nextApproximate,
      peakViewers: nextPeak,
    },
    select: { approximateViewers: true, peakViewers: true },
  });

  return updated;
}

/** Decay approximate viewers softly on heartbeat gaps (optional helper). */
export async function touchPresence(sessionId: string, currentCount?: number) {
  if (currentCount === undefined) {
    return bumpApproximateViewers(sessionId);
  }

  const session = await db.liveSession.findUnique({
    where: { id: sessionId },
    select: { peakViewers: true, status: true },
  });
  if (!session || (session.status !== 'live' && session.status !== 'paused')) return null;

  const approximateViewers = Math.max(0, currentCount);
  const peakViewers = Math.max(session.peakViewers, approximateViewers);

  return db.liveSession.update({
    where: { id: sessionId },
    data: { approximateViewers, peakViewers },
    select: { approximateViewers: true, peakViewers: true },
  });
}
