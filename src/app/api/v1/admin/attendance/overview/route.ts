import { db } from '@/lib/db';
import { forbidden, success } from '@/lib/api/response';
import { guardAdminRead } from '@/lib/admin/guard';
import { canViewAttendance, sessionListWhere } from '@/lib/attendance/access';
import { serializeSessionList } from '@/lib/attendance/serialize';
import { sessionAdminInclude } from '@/lib/attendance/serialize';
import { zonedDateKey } from '@/lib/events/timezone';
import { churchTimezone } from '@/lib/attendance/series';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'attendance', 'view');
  if (!auth.ok) return auth.error;
  if (!canViewAttendance(auth.user)) return forbidden();

  const timezone = await churchTimezone();
  const todayKey = zonedDateKey(new Date(), timezone);
  const dayStart = new Date(`${todayKey}T00:00:00.000Z`);
  const dayEnd = new Date(dayStart.getTime() + 48 * 60 * 60_000);

  const scope = sessionListWhere(auth.user);
  const [openSessions, todaySessions, recentRecords, weekPresent] = await Promise.all([
    db.attendanceSession.findMany({
      where: { ...scope, status: 'open' },
      include: sessionAdminInclude,
      orderBy: { startsAt: 'asc' },
      take: 10,
    }),
    db.attendanceSession.findMany({
      where: {
        ...scope,
        startsAt: { gte: new Date(Date.now() - 12 * 60 * 60_000), lte: dayEnd },
        status: { in: ['open', 'closed', 'scheduled'] },
      },
      include: sessionAdminInclude,
      orderBy: { startsAt: 'asc' },
      take: 20,
    }),
    db.attendanceRecord.findMany({
      where: {
        session: scope,
        checkInAt: { gte: new Date(Date.now() - 24 * 60 * 60_000) },
        status: { in: ['present', 'late'] },
      },
      include: {
        member: {
          select: {
            id: true,
            membershipNumber: true,
            displayName: true,
            user: { select: { firstName: true, lastName: true } },
          },
        },
        session: { select: { id: true, title: true } },
      },
      orderBy: { checkInAt: 'desc' },
      take: 12,
    }),
    db.attendanceRecord.count({
      where: {
        session: scope,
        status: { in: ['present', 'late'] },
        checkInAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60_000) },
      },
    }),
  ]);

  const todayCheckedIn = await db.attendanceRecord.count({
    where: {
      sessionId: { in: todaySessions.map((s) => s.id) },
      status: { in: ['present', 'late'] },
    },
  });

  return success({
    timezone,
    todayKey,
    openSessions: openSessions.map(serializeSessionList),
    todaySessions: todaySessions.map(serializeSessionList),
    todayCheckedIn,
    weekPresent,
    recentCheckIns: recentRecords.map((row) => ({
      id: row.id,
      checkInAt: row.checkInAt?.toISOString() ?? null,
      status: row.status,
      session: row.session,
      member: {
        id: row.member.id,
        membershipNumber: row.member.membershipNumber,
        name:
          row.member.displayName ||
          `${row.member.user.firstName} ${row.member.user.lastName}`.trim(),
      },
    })),
  });
}
