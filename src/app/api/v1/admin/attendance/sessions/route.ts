import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { error, forbidden, paginated, success, validationError } from '@/lib/api/response';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { formatZodErrors } from '@/lib/auth/validation';
import { readJson } from '@/lib/auth/http';
import { parseEventDateTime } from '@/lib/events/timezone';
import {
  canCreateAttendance,
  canViewAttendance,
  sessionListWhere,
} from '@/lib/attendance/access';
import { canTransitionSession } from '@/lib/attendance/status';
import { sessionCreateSchema, sessionListQuerySchema } from '@/lib/attendance/validation';
import { sessionAdminInclude, serializeSessionList } from '@/lib/attendance/serialize';
import { emitAttendanceEvent } from '@/lib/attendance/events';
import { churchTimezone } from '@/lib/attendance/series';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'attendance', 'view');
  if (!auth.ok) return auth.error;
  if (!canViewAttendance(auth.user)) return forbidden();

  const url = new URL(request.url);
  const parsed = sessionListQuerySchema.safeParse({
    q: url.searchParams.get('q') || undefined,
    status: url.searchParams.get('status') || undefined,
    sessionType: url.searchParams.get('sessionType') || undefined,
    ministryId: url.searchParams.get('ministryId') || undefined,
    eventId: url.searchParams.get('eventId') || undefined,
    from: url.searchParams.get('from') || undefined,
    to: url.searchParams.get('to') || undefined,
    page: url.searchParams.get('page') || 1,
    pageSize: url.searchParams.get('pageSize') || 20,
  });
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const { q, status, sessionType, ministryId, eventId, from, to, page, pageSize } = parsed.data;
  const and: Prisma.AttendanceSessionWhereInput[] = [sessionListWhere(auth.user)];
  if (q) and.push({ OR: [{ title: { contains: q } }, { locationNote: { contains: q } }] });
  if (status) and.push({ status });
  if (sessionType) and.push({ sessionType });
  if (ministryId) and.push({ ministryId });
  if (eventId) and.push({ eventId });
  if (from) {
    const date = new Date(from);
    if (!Number.isNaN(date.getTime())) and.push({ startsAt: { gte: date } });
  }
  if (to) {
    const date = new Date(to);
    if (!Number.isNaN(date.getTime())) and.push({ startsAt: { lte: date } });
  }

  const where: Prisma.AttendanceSessionWhereInput = { AND: and };
  const [totalItems, rows] = await Promise.all([
    db.attendanceSession.count({ where }),
    db.attendanceSession.findMany({
      where,
      include: sessionAdminInclude,
      orderBy: { startsAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return paginated(rows.map(serializeSessionList), { page, pageSize, totalItems });
}

export async function POST(request: Request) {
  const auth = await guardAdminWrite(request, 'attendance', 'create');
  if (!auth.ok) return auth.error;
  if (!canCreateAttendance(auth.user)) return forbidden();

  const parsed = sessionCreateSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const timezone = parsed.data.timezone || (await churchTimezone());
  const startsAt = parseEventDateTime(parsed.data.startsAt, timezone);
  if (!startsAt) return error('Invalid start time.', 400);
  const endsAt = parsed.data.endsAt
    ? parseEventDateTime(parsed.data.endsAt, timezone)
    : null;
  if (parsed.data.endsAt && !endsAt) return error('Invalid end time.', 400);
  if (endsAt && endsAt <= startsAt) return error('End time must be after start time.', 400);

  const status = parsed.data.status || 'draft';
  if (!canTransitionSession('draft', status) && status !== 'draft') {
    return error('Invalid initial session status.', 400);
  }

  const created = await db.attendanceSession.create({
    data: {
      title: parsed.data.title,
      sessionType: parsed.data.sessionType,
      status,
      startsAt,
      endsAt,
      timezone,
      locationNote: parsed.data.locationNote || null,
      notes: parsed.data.notes || null,
      eventId: parsed.data.eventId || null,
      ministryId: parsed.data.ministryId || null,
      locationId: parsed.data.locationId || null,
      seriesId: parsed.data.seriesId || null,
      allowSelfCheckIn: parsed.data.allowSelfCheckIn ?? true,
      allowQrCheckIn: parsed.data.allowQrCheckIn ?? true,
      openedAt: status === 'open' ? new Date() : null,
      createdById: auth.user.id,
    },
    include: sessionAdminInclude,
  });

  await emitAttendanceEvent({
    type: 'attendance.session_created',
    userId: auth.user.id,
    entityId: created.id,
    request,
    details: { status: created.status, sessionType: created.sessionType },
  });

  return success({ session: serializeSessionList(created) }, 'Session created.', 201);
}
