import { db } from '@/lib/db';
import { success } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';
import { getClientIp } from '@/lib/auth/audit';
import { rateLimitKey } from '@/lib/auth/rate-limit';
import { tooManyRequests } from '@/lib/api/response';
import { isSessionAcceptingCheckIns } from '@/lib/attendance/status';
import { serializeActiveSession } from '@/lib/attendance/serialize';
import { requireActiveMemberForUser } from '@/lib/attendance/write';

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const limited = rateLimitKey(
    `attendance-active:${auth.user.id}:${getClientIp(request)}`,
    60,
    60_000
  );
  if (!limited.allowed) {
    return tooManyRequests('Too many requests. Please wait a moment.', limited.retryAfterSeconds);
  }

  const member = await requireActiveMemberForUser(auth.user.id);
  const now = new Date();
  const rows = await db.attendanceSession.findMany({
    where: {
      status: 'open',
      allowSelfCheckIn: true,
      startsAt: { lte: new Date(now.getTime() + 60 * 60_000) },
    },
    include: {
      location: { select: { id: true, name: true } },
      ministry: { select: { id: true, name: true, slug: true } },
      event: { select: { id: true, title: true, slug: true } },
    },
    orderBy: { startsAt: 'asc' },
    take: 30,
  });

  const active = rows.filter((row) => isSessionAcceptingCheckIns(row, now, { requireSelfFlag: true }));

  let checkedInIds = new Set<string>();
  if (member) {
    const mine = await db.attendanceRecord.findMany({
      where: {
        memberId: member.id,
        sessionId: { in: active.map((s) => s.id) },
      },
      select: { sessionId: true },
    });
    checkedInIds = new Set(mine.map((r) => r.sessionId));
  }

  return success({
    sessions: active.map((row) => ({
      ...serializeActiveSession(row),
      alreadyCheckedIn: checkedInIds.has(row.id),
    })),
    hasMembership: Boolean(member),
  });
}
