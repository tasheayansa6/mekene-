import { db } from '@/lib/db';
import { forbidden, success } from '@/lib/api/response';
import { guardAdminRead } from '@/lib/admin/guard';
import { canViewAttendance } from '@/lib/attendance/access';
import { SESSION_TYPES, sessionTypeLabel } from '@/lib/attendance/status';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'attendance', 'view');
  if (!auth.ok) return auth.error;
  if (!canViewAttendance(auth.user)) return forbidden();

  const [ministries, events, locations] = await Promise.all([
    db.ministry.findMany({
      where: { isActive: true },
      select: { id: true, name: true, slug: true },
      orderBy: { name: 'asc' },
      take: 200,
    }),
    db.event.findMany({
      where: { status: { in: ['published', 'scheduled'] } },
      select: { id: true, title: true, slug: true, startAt: true },
      orderBy: { startAt: 'desc' },
      take: 100,
    }),
    db.eventLocation.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  return success({
    sessionTypes: SESSION_TYPES.map((value) => ({
      value,
      label: sessionTypeLabel(value),
    })),
    ministries,
    events,
    locations,
  });
}
