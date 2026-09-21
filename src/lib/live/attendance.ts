import { db } from '@/lib/db';
import { rateLimitKey } from '@/lib/auth/rate-limit';

export function attendanceRateLimitKey(sessionId: string, actorKey: string): string {
  return `live:attendance:${sessionId}:${actorKey}`;
}

export function enforceAttendanceRateLimit(sessionId: string, actorKey: string) {
  return rateLimitKey(attendanceRateLimitKey(sessionId, actorKey), 5, 60_000);
}

export async function checkInLiveAttendance(input: {
  sessionId: string;
  userId?: string | null;
  visitorKey?: string | null;
}) {
  if (!input.userId && !input.visitorKey) {
    return { ok: false as const, error: 'A user or visitor key is required.' };
  }

  const session = await db.liveSession.findUnique({
    where: { id: input.sessionId },
    select: { id: true, attendanceEnabled: true, status: true },
  });
  if (!session) return { ok: false as const, error: 'Live session not found.', status: 404 as const };
  if (!session.attendanceEnabled) {
    return { ok: false as const, error: 'Attendance is disabled for this session.', status: 403 as const };
  }

  const actorKey = input.userId || input.visitorKey!;
  const limited = enforceAttendanceRateLimit(session.id, actorKey);
  if (!limited.allowed) {
    return {
      ok: false as const,
      error: 'Please wait before checking in again.',
      status: 429 as const,
      retryAfterSeconds: limited.retryAfterSeconds,
    };
  }

  try {
    const row = await db.liveAttendance.create({
      data: {
        liveSessionId: session.id,
        userId: input.userId || null,
        visitorKey: input.userId ? null : input.visitorKey || null,
      },
    });
    return { ok: true as const, attendance: row, alreadyCheckedIn: false };
  } catch {
    const existing = await db.liveAttendance.findFirst({
      where: {
        liveSessionId: session.id,
        ...(input.userId ? { userId: input.userId } : { visitorKey: input.visitorKey }),
      },
    });
    return { ok: true as const, attendance: existing, alreadyCheckedIn: true };
  }
}

export async function countLiveAttendance(sessionId: string): Promise<number> {
  return db.liveAttendance.count({ where: { liveSessionId: sessionId } });
}
