import { db } from '@/lib/db';
import { forbidden, success, validationError } from '@/lib/api/response';
import { guardAdminRead } from '@/lib/admin/guard';
import { formatZodErrors } from '@/lib/auth/validation';
import { canViewAttendance, sessionListWhere } from '@/lib/attendance/access';
import { reportsQuerySchema } from '@/lib/attendance/validation';
import { sessionTypeLabel } from '@/lib/attendance/status';
import { zonedDateKey } from '@/lib/events/timezone';
import { churchTimezone } from '@/lib/attendance/series';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'attendance', 'view');
  if (!auth.ok) return auth.error;
  if (!canViewAttendance(auth.user)) return forbidden();

  const url = new URL(request.url);
  const parsed = reportsQuerySchema.safeParse({
    from: url.searchParams.get('from') || undefined,
    to: url.searchParams.get('to') || undefined,
    sessionType: url.searchParams.get('sessionType') || undefined,
    ministryId: url.searchParams.get('ministryId') || undefined,
    groupBy: url.searchParams.get('groupBy') || 'day',
  });
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const timezone = await churchTimezone();
  const to = parsed.data.to ? new Date(parsed.data.to) : new Date();
  const from = parsed.data.from
    ? new Date(parsed.data.from)
    : new Date(to.getTime() - 30 * 24 * 60 * 60_000);

  const sessionWhere = {
    ...sessionListWhere(auth.user),
    startsAt: { gte: from, lte: to },
    ...(parsed.data.sessionType ? { sessionType: parsed.data.sessionType } : {}),
    ...(parsed.data.ministryId ? { ministryId: parsed.data.ministryId } : {}),
  };

  const sessions = await db.attendanceSession.findMany({
    where: sessionWhere,
    select: {
      id: true,
      title: true,
      sessionType: true,
      startsAt: true,
      ministryId: true,
      ministry: { select: { id: true, name: true } },
      records: {
        select: { status: true },
      },
    },
    orderBy: { startsAt: 'asc' },
  });

  let totalPresent = 0;
  let totalLate = 0;
  let totalExcused = 0;
  let totalAbsent = 0;
  let totalRecords = 0;

  const buckets = new Map<
    string,
    { key: string; label: string; present: number; late: number; excused: number; sessions: number }
  >();

  for (const session of sessions) {
    const present = session.records.filter((r) => r.status === 'present').length;
    const late = session.records.filter((r) => r.status === 'late').length;
    const excused = session.records.filter((r) => r.status === 'excused').length;
    const absent = session.records.filter((r) => r.status === 'absent').length;
    totalPresent += present;
    totalLate += late;
    totalExcused += excused;
    totalAbsent += absent;
    totalRecords += session.records.length;

    let key = zonedDateKey(session.startsAt, timezone);
    let label = key;
    if (parsed.data.groupBy === 'sessionType') {
      key = session.sessionType;
      label = sessionTypeLabel(session.sessionType);
    } else if (parsed.data.groupBy === 'ministry') {
      key = session.ministryId || 'none';
      label = session.ministry?.name || 'No ministry';
    } else if (parsed.data.groupBy === 'week') {
      const d = new Date(session.startsAt);
      const week = zonedDateKey(
        new Date(d.getTime() - d.getUTCDay() * 24 * 60 * 60_000),
        timezone
      );
      key = week;
      label = `Week of ${week}`;
    } else if (parsed.data.groupBy === 'month') {
      key = zonedDateKey(session.startsAt, timezone).slice(0, 7);
      label = key;
    }

    const bucket = buckets.get(key) || {
      key,
      label,
      present: 0,
      late: 0,
      excused: 0,
      sessions: 0,
    };
    bucket.present += present;
    bucket.late += late;
    bucket.excused += excused;
    bucket.sessions += 1;
    buckets.set(key, bucket);
  }

  const checkedIn = totalPresent + totalLate;
  const averagePerSession =
    sessions.length > 0 ? Math.round((checkedIn / sessions.length) * 10) / 10 : 0;

  return success({
    metrics: {
      totalSessions: sessions.length,
      totalPresent,
      totalLate,
      totalExcused,
      totalAbsent,
      totalRecords,
      checkedIn,
      averageAttendance: averagePerSession,
      definitions: {
        totalPresent: 'Records marked present in the selected period.',
        totalLate: 'Records marked late in the selected period.',
        totalExcused: 'Records marked excused.',
        averageAttendance: 'Average of present+late records per session (not a membership percentage).',
      },
    },
    series: Array.from(buckets.values()),
    from: from.toISOString(),
    to: to.toISOString(),
    groupBy: parsed.data.groupBy,
    timezone,
  });
}
