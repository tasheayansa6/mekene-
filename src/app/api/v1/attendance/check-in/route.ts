import { db } from '@/lib/db';
import { error, success, validationError } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';
import { formatZodErrors } from '@/lib/auth/validation';
import { readJson, rejectIfCsrfInvalid } from '@/lib/auth/http';
import { getClientIp } from '@/lib/auth/audit';
import { rateLimitKey } from '@/lib/auth/rate-limit';
import { tooManyRequests } from '@/lib/api/response';
import { selfCheckInSchema } from '@/lib/attendance/validation';
import { isSessionAcceptingCheckIns } from '@/lib/attendance/status';
import {
  createCheckInRecord,
  requireActiveMemberForUser,
} from '@/lib/attendance/write';
import { emitAttendanceEvent } from '@/lib/attendance/events';
import { serializeRecordSelf } from '@/lib/attendance/serialize';

export async function POST(request: Request) {
  const csrfError = rejectIfCsrfInvalid(request);
  if (csrfError) return csrfError;

  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const limited = rateLimitKey(
    `attendance-checkin:${auth.user.id}:${getClientIp(request)}`,
    20,
    60_000
  );
  if (!limited.allowed) {
    return tooManyRequests(
      'Too many check-in attempts. Please wait a moment.',
      limited.retryAfterSeconds
    );
  }

  const parsed = selfCheckInSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const member = await requireActiveMemberForUser(auth.user.id);
  if (!member) {
    return error('Church membership is required to check in.', 403);
  }

  const session = await db.attendanceSession.findUnique({
    where: { id: parsed.data.sessionId },
  });
  if (!session) return error('Attendance session not found.', 404);
  if (!isSessionAcceptingCheckIns(session, new Date(), { requireSelfFlag: true })) {
    return error('This attendance session is not open for check-in.', 409);
  }

  const result = await createCheckInRecord({
    sessionId: session.id,
    memberId: member.id,
    method: 'self',
    recordedById: auth.user.id,
  });

  if (!result.ok) {
    return error('You are already checked in for this session.', 409);
  }

  await emitAttendanceEvent({
    type: 'attendance.check_in',
    userId: auth.user.id,
    entityId: result.record.id,
    request,
    details: { sessionId: session.id, method: 'self' },
  });

  const full = await db.attendanceRecord.findUnique({
    where: { id: result.record.id },
    include: {
      session: {
        select: {
          id: true,
          title: true,
          sessionType: true,
          startsAt: true,
          timezone: true,
        },
      },
    },
  });

  return success(
    { record: full ? serializeRecordSelf(full) : null },
    'You are checked in.',
    201
  );
}
