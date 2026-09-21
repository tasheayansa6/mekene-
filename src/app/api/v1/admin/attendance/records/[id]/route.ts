import { db } from '@/lib/db';
import { forbidden, notFound, success, validationError } from '@/lib/api/response';
import { guardAdminWrite } from '@/lib/admin/guard';
import { formatZodErrors } from '@/lib/auth/validation';
import { readJson } from '@/lib/auth/http';
import { parseEventDateTime } from '@/lib/events/timezone';
import { canCorrectAttendance, sessionListWhere } from '@/lib/attendance/access';
import { recordPatchSchema } from '@/lib/attendance/validation';
import { recordAdminInclude, serializeRecordAdmin } from '@/lib/attendance/serialize';
import { snapshotRecord } from '@/lib/attendance/write';
import { emitAttendanceEvent } from '@/lib/attendance/events';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await guardAdminWrite(request, 'attendance', 'moderate');
  if (!auth.ok) return auth.error;
  if (!canCorrectAttendance(auth.user)) return forbidden();

  const parsed = recordPatchSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const { id } = await context.params;
  const existing = await db.attendanceRecord.findFirst({
    where: { id, session: sessionListWhere(auth.user) },
    include: { session: { select: { timezone: true } } },
  });
  if (!existing) return notFound('Attendance record');

  const checkInAt =
    parsed.data.checkInAt === undefined
      ? undefined
      : parsed.data.checkInAt
        ? parseEventDateTime(parsed.data.checkInAt, existing.session.timezone)
        : null;
  const checkOutAt =
    parsed.data.checkOutAt === undefined
      ? undefined
      : parsed.data.checkOutAt
        ? parseEventDateTime(parsed.data.checkOutAt, existing.session.timezone)
        : null;

  const oldValue = snapshotRecord(existing);
  const updated = await db.attendanceRecord.update({
    where: { id: existing.id },
    data: {
      status: parsed.data.status,
      method: parsed.data.method,
      checkInAt: parsed.data.checkInAt === undefined ? undefined : checkInAt,
      checkOutAt: parsed.data.checkOutAt === undefined ? undefined : checkOutAt,
      notes: parsed.data.notes === undefined ? undefined : parsed.data.notes,
    },
    include: recordAdminInclude,
  });

  await db.attendanceCorrection.create({
    data: {
      recordId: existing.id,
      oldValue,
      newValue: snapshotRecord(updated),
      reason: parsed.data.reason,
      changedById: auth.user.id,
    },
  });

  await emitAttendanceEvent({
    type: 'attendance.record_corrected',
    userId: auth.user.id,
    entityId: existing.id,
    request,
    details: { reason: parsed.data.reason },
  });

  return success({ record: serializeRecordAdmin(updated) }, 'Attendance corrected.');
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await guardAdminWrite(request, 'attendance', 'moderate');
  if (!auth.ok) return auth.error;
  if (!canCorrectAttendance(auth.user)) return forbidden();

  const { id } = await context.params;
  const existing = await db.attendanceRecord.findFirst({
    where: { id, session: sessionListWhere(auth.user) },
  });
  if (!existing) return notFound('Attendance record');

  await db.attendanceRecord.delete({ where: { id: existing.id } });

  await emitAttendanceEvent({
    type: 'attendance.record_removed',
    userId: auth.user.id,
    entityId: existing.id,
    request,
    details: { sessionId: existing.sessionId, memberId: existing.memberId },
  });

  return success({ removed: true }, 'Attendance record removed.');
}
