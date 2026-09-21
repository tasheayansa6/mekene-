import { db } from '@/lib/db';
import { success } from '@/lib/api/response';
import { buildDashboardStats } from '@/lib/admin/dashboard';
import { enforceAdminRateLimit, guardAdminRead } from '@/lib/admin/guard';
import { hasPermission } from '@/lib/auth/permissions';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request);
  if (!auth.ok) return auth.error;

  const limited = enforceAdminRateLimit(request, auth.user.id, 'dashboard');
  if (limited) return limited;

  const [
    usersTotal,
    usersActive,
    ministriesTotal,
    ministriesActive,
    leadersTotal,
    leadersActive,
    churchProfile,
    locationCount,
    serviceCount,
  ] = await db.$transaction([
    db.user.count(),
    db.user.count({ where: { status: 'active' } }),
    db.ministry.count(),
    db.ministry.count({
      where: { isActive: true, status: { not: 'archived' } },
    }),
    db.leader.count(),
    db.leader.count({
      where: { isActive: true, status: { not: 'archived' } },
    }),
    db.churchProfile.findFirst({ select: { status: true } }),
    db.churchLocation.count({ where: { isActive: true } }),
    db.serviceSchedule.count({ where: { isActive: true } }),
  ]);

  let prayer: {
    new: number;
    underReview: number;
    assigned: number;
    praying: number;
    answered: number;
  } | null = null;

  if (hasPermission(auth.user, 'prayer', 'view')) {
    const [newCount, underReview, assigned, praying, answered] = await db.$transaction([
      db.prayerRequest.count({ where: { status: 'new' } }),
      db.prayerRequest.count({ where: { status: 'under_review' } }),
      db.prayerRequest.count({ where: { status: 'assigned' } }),
      db.prayerRequest.count({ where: { status: 'praying' } }),
      db.prayerRequest.count({ where: { status: 'answered' } }),
    ]);
    prayer = { new: newCount, underReview, assigned, praying, answered };
  }

  let attendance: { openSessions: number; todayCheckedIn: number } | null = null;
  if (hasPermission(auth.user, 'attendance', 'view')) {
    const openSessions = await db.attendanceSession.count({ where: { status: 'open' } });
    const todayCheckedIn = await db.attendanceRecord.count({
      where: {
        status: { in: ['present', 'late'] },
        checkInAt: { gte: new Date(Date.now() - 24 * 60 * 60_000) },
      },
    });
    attendance = { openSessions, todayCheckedIn };
  }

  return success(
    buildDashboardStats({
      usersTotal,
      usersActive,
      ministriesTotal,
      ministriesActive,
      leadersTotal,
      leadersActive,
      churchProfile,
      locationCount,
      serviceCount,
      prayer,
      attendance,
    })
  );
}
