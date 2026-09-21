import { db } from '@/lib/db';
import { forbidden, notFound, paginated, success } from '@/lib/api/response';
import { guardAdminRead } from '@/lib/admin/guard';
import { canViewAttendance, sessionListWhere } from '@/lib/attendance/access';
import { memberByIdWhere, canViewMembers } from '@/lib/members/access';
import { serializeRecordSelf } from '@/lib/attendance/serialize';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await guardAdminRead(request, 'attendance', 'view');
  if (!auth.ok) return auth.error;
  if (!canViewAttendance(auth.user) || !canViewMembers(auth.user)) return forbidden();

  const { id } = await context.params;
  const member = await db.member.findFirst({
    where: memberByIdWhere(auth.user, id),
    select: {
      id: true,
      membershipNumber: true,
      displayName: true,
      status: true,
      user: { select: { firstName: true, lastName: true } },
    },
  });
  if (!member) return notFound('Member');

  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get('page') || 1));
  const pageSize = Math.min(50, Math.max(1, Number(url.searchParams.get('pageSize') || 20)));

  const where = {
    memberId: member.id,
    session: sessionListWhere(auth.user),
  };

  const [totalItems, rows, presentCount] = await Promise.all([
    db.attendanceRecord.count({ where }),
    db.attendanceRecord.findMany({
      where,
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
      orderBy: { checkInAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.attendanceRecord.count({
      where: { ...where, status: { in: ['present', 'late'] } },
    }),
  ]);

  return success({
    member: {
      id: member.id,
      membershipNumber: member.membershipNumber,
      name:
        member.displayName ||
        `${member.user.firstName} ${member.user.lastName}`.trim(),
      status: member.status,
    },
    stats: {
      totalRecords: totalItems,
      presentOrLate: presentCount,
    },
    records: rows.map(serializeRecordSelf),
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
    },
  });
}
