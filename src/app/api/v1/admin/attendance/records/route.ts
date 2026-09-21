import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { error, forbidden, notFound, paginated, success, validationError } from '@/lib/api/response';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { formatZodErrors } from '@/lib/auth/validation';
import { readJson } from '@/lib/auth/http';
import { parseEventDateTime } from '@/lib/events/timezone';
import {
  canCreateAttendance,
  canViewAttendance,
  sessionByIdWhere,
  sessionListWhere,
} from '@/lib/attendance/access';
import { recordCreateSchema, recordListQuerySchema } from '@/lib/attendance/validation';
import { recordAdminInclude, serializeRecordAdmin } from '@/lib/attendance/serialize';
import { createCheckInRecord } from '@/lib/attendance/write';
import { emitAttendanceEvent } from '@/lib/attendance/events';
import { isCurrentMember } from '@/lib/members/status';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'attendance', 'view');
  if (!auth.ok) return auth.error;
  if (!canViewAttendance(auth.user)) return forbidden();

  const url = new URL(request.url);
  const parsed = recordListQuerySchema.safeParse({
    sessionId: url.searchParams.get('sessionId') || undefined,
    memberId: url.searchParams.get('memberId') || undefined,
    status: url.searchParams.get('status') || undefined,
    q: url.searchParams.get('q') || undefined,
    page: url.searchParams.get('page') || 1,
    pageSize: url.searchParams.get('pageSize') || 20,
  });
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const { sessionId, memberId, status, q, page, pageSize } = parsed.data;
  const and: Prisma.AttendanceRecordWhereInput[] = [
    { session: sessionListWhere(auth.user) },
  ];
  if (sessionId) and.push({ sessionId });
  if (memberId) and.push({ memberId });
  if (status) and.push({ status });
  if (q) {
    and.push({
      OR: [
        { member: { membershipNumber: { contains: q } } },
        { member: { displayName: { contains: q } } },
        { member: { user: { firstName: { contains: q } } } },
        { member: { user: { lastName: { contains: q } } } },
      ],
    });
  }

  const where: Prisma.AttendanceRecordWhereInput = { AND: and };
  const [totalItems, rows] = await Promise.all([
    db.attendanceRecord.count({ where }),
    db.attendanceRecord.findMany({
      where,
      include: recordAdminInclude,
      orderBy: { checkInAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return paginated(rows.map(serializeRecordAdmin), { page, pageSize, totalItems });
}

export async function POST(request: Request) {
  const auth = await guardAdminWrite(request, 'attendance', 'create');
  if (!auth.ok) return auth.error;
  if (!canCreateAttendance(auth.user)) return forbidden();

  const parsed = recordCreateSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const session = await db.attendanceSession.findFirst({
    where: sessionByIdWhere(auth.user, parsed.data.sessionId),
  });
  if (!session) return notFound('Attendance session');
  if (session.status === 'archived') {
    return error('Cannot record attendance on an archived session.', 409);
  }

  const member = await db.member.findUnique({ where: { id: parsed.data.memberId } });
  if (!member || !isCurrentMember(member.status)) {
    return error('Member not found or not an active church member.', 404);
  }

  const checkInAt = parsed.data.checkInAt
    ? parseEventDateTime(parsed.data.checkInAt, session.timezone)
    : new Date();
  if (parsed.data.checkInAt && !checkInAt) return error('Invalid check-in time.', 400);

  const result = await createCheckInRecord({
    sessionId: session.id,
    memberId: member.id,
    method: parsed.data.method || 'admin',
    status: parsed.data.status || 'present',
    recordedById: auth.user.id,
    checkInAt,
    notes: parsed.data.notes || null,
  });

  if (!result.ok) {
    return error('This member is already recorded for this session.', 409);
  }

  await emitAttendanceEvent({
    type: 'attendance.record_created',
    userId: auth.user.id,
    entityId: result.record.id,
    request,
    details: { sessionId: session.id, memberId: member.id, method: parsed.data.method || 'admin' },
  });

  const full = await db.attendanceRecord.findUnique({
    where: { id: result.record.id },
    include: recordAdminInclude,
  });

  return success(
    { record: full ? serializeRecordAdmin(full) : null },
    'Attendance recorded.',
    201
  );
}
