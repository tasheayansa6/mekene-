import { db } from '@/lib/db';
import { error, forbidden, notFound, success, validationError } from '@/lib/api/response';
import { guardAdminWrite } from '@/lib/admin/guard';
import { formatZodErrors } from '@/lib/auth/validation';
import { readJson } from '@/lib/auth/http';
import { canManageQr, sessionByIdWhere } from '@/lib/attendance/access';
import { qrGenerateSchema } from '@/lib/attendance/validation';
import { issueSessionQrToken } from '@/lib/attendance/write';
import { emitAttendanceEvent } from '@/lib/attendance/events';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await guardAdminWrite(request, 'attendance', 'assign');
  if (!auth.ok) return auth.error;
  if (!canManageQr(auth.user)) return forbidden();

  const parsed = qrGenerateSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const { id } = await context.params;
  const session = await db.attendanceSession.findFirst({
    where: sessionByIdWhere(auth.user, id),
  });
  if (!session) return notFound('Attendance session');
  if (session.status !== 'open') {
    return error('QR check-in is only available for open sessions.', 409);
  }
  if (!session.allowQrCheckIn) {
    return error('QR check-in is disabled for this session.', 409);
  }

  await db.attendanceQrToken.updateMany({
    where: { sessionId: session.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  const issued = await issueSessionQrToken({
    sessionId: session.id,
    createdById: auth.user.id,
    ttlMinutes: parsed.data.ttlMinutes,
  });

  await emitAttendanceEvent({
    type: 'attendance.qr_generated',
    userId: auth.user.id,
    entityId: session.id,
    request,
    details: { expiresAt: issued.expiresAt.toISOString() },
  });

  return success(
    {
      token: issued.token,
      expiresAt: issued.expiresAt.toISOString(),
      sessionId: session.id,
    },
    'QR token created.'
  );
}
