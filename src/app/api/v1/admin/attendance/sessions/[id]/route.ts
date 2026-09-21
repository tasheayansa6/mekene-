import { db } from '@/lib/db';
import { error, forbidden, notFound, success, validationError } from '@/lib/api/response';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { formatZodErrors } from '@/lib/auth/validation';
import { readJson } from '@/lib/auth/http';
import { parseEventDateTime } from '@/lib/events/timezone';
import {
  canArchiveAttendance,
  canUpdateAttendance,
  canViewAttendance,
  sessionByIdWhere,
} from '@/lib/attendance/access';
import { canTransitionSession } from '@/lib/attendance/status';
import { sessionPatchSchema } from '@/lib/attendance/validation';
import {
  sessionDetailInclude,
  serializeSessionDetail,
} from '@/lib/attendance/serialize';
import { emitAttendanceEvent } from '@/lib/attendance/events';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await guardAdminRead(request, 'attendance', 'view');
  if (!auth.ok) return auth.error;
  if (!canViewAttendance(auth.user)) return forbidden();

  const { id } = await context.params;
  const session = await db.attendanceSession.findFirst({
    where: sessionByIdWhere(auth.user, id),
    include: sessionDetailInclude,
  });
  if (!session) return notFound('Attendance session');

  return success({ session: serializeSessionDetail(session) });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await guardAdminWrite(request, 'attendance', 'update');
  if (!auth.ok) return auth.error;
  if (!canUpdateAttendance(auth.user)) return forbidden();

  const parsed = sessionPatchSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const { id } = await context.params;
  const existing = await db.attendanceSession.findFirst({
    where: sessionByIdWhere(auth.user, id),
  });
  if (!existing) return notFound('Attendance session');

  if (parsed.data.status && parsed.data.status !== existing.status) {
    if (parsed.data.status === 'archived' && !canArchiveAttendance(auth.user)) {
      return forbidden();
    }
    if (!canTransitionSession(existing.status, parsed.data.status)) {
      return error('That session status change is not allowed.', 409);
    }
  }

  const timezone = parsed.data.timezone || existing.timezone;
  const startsAt =
    parsed.data.startsAt === undefined
      ? undefined
      : parseEventDateTime(parsed.data.startsAt, timezone);
  if (parsed.data.startsAt !== undefined && !startsAt) {
    return error('Invalid start time.', 400);
  }
  const endsAt =
    parsed.data.endsAt === undefined
      ? undefined
      : parsed.data.endsAt
        ? parseEventDateTime(parsed.data.endsAt, timezone)
        : null;
  if (parsed.data.endsAt && endsAt === null && parsed.data.endsAt !== null) {
    return error('Invalid end time.', 400);
  }

  const nextStatus = parsed.data.status || existing.status;
  const updated = await db.attendanceSession.update({
    where: { id: existing.id },
    data: {
      title: parsed.data.title,
      sessionType: parsed.data.sessionType,
      status: parsed.data.status,
      startsAt,
      endsAt: parsed.data.endsAt === undefined ? undefined : endsAt,
      timezone: parsed.data.timezone,
      locationNote:
        parsed.data.locationNote === undefined ? undefined : parsed.data.locationNote,
      notes: parsed.data.notes === undefined ? undefined : parsed.data.notes,
      eventId: parsed.data.eventId === undefined ? undefined : parsed.data.eventId,
      ministryId: parsed.data.ministryId === undefined ? undefined : parsed.data.ministryId,
      locationId: parsed.data.locationId === undefined ? undefined : parsed.data.locationId,
      allowSelfCheckIn: parsed.data.allowSelfCheckIn,
      allowQrCheckIn: parsed.data.allowQrCheckIn,
      openedAt:
        nextStatus === 'open' && existing.status !== 'open'
          ? new Date()
          : nextStatus !== 'open' && existing.status === 'open'
            ? existing.openedAt
            : undefined,
      closedAt:
        nextStatus === 'closed' && existing.status !== 'closed'
          ? new Date()
          : nextStatus === 'open'
            ? null
            : undefined,
    },
    include: sessionDetailInclude,
  });

  if (parsed.data.status && parsed.data.status !== existing.status) {
    const type =
      parsed.data.status === 'open'
        ? 'attendance.session_opened'
        : parsed.data.status === 'closed'
          ? 'attendance.session_closed'
          : parsed.data.status === 'archived'
            ? 'attendance.session_archived'
            : 'attendance.session_updated';
    await emitAttendanceEvent({
      type,
      userId: auth.user.id,
      entityId: existing.id,
      request,
      details: { from: existing.status, to: parsed.data.status },
    });
  } else {
    await emitAttendanceEvent({
      type: 'attendance.session_updated',
      userId: auth.user.id,
      entityId: existing.id,
      request,
      details: { fields: Object.keys(parsed.data) },
    });
  }

  return success({ session: serializeSessionDetail(updated) }, 'Session updated.');
}
