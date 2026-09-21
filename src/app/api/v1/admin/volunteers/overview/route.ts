import { db } from '@/lib/db';
import { forbidden, success } from '@/lib/api/response';
import { guardAdminRead } from '@/lib/admin/guard';
import { canViewVolunteers } from '@/lib/volunteers/access';
import { volunteerLeaderScope } from '@/lib/volunteers/scope';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'volunteers', 'view');
  if (!auth.ok) return auth.error;
  if (!canViewVolunteers(auth.user)) return forbidden();

  const scope = await volunteerLeaderScope(auth.user);
  const now = new Date();
  const ministryFilter = scope.isGlobal ? {} : { ministryId: { in: scope.ministryIds } };

  const [active, applications, teams, upcoming, hours] = await Promise.all([
    db.volunteerProfile.count({
      where: { status: { in: ['approved', 'active'] } },
    }),
    db.volunteerApplication.count({
      where: { status: { in: ['submitted', 'under_review', 'more_info'] }, ...ministryFilter },
    }),
    db.ministryTeam.count({
      where: { isActive: true, ...(scope.isGlobal ? {} : { id: { in: scope.teamIds } }) },
    }),
    db.serviceAssignment.count({
      where: {
        scheduledAt: { gte: now },
        status: { in: ['proposed', 'assigned', 'confirmed'] },
        ...ministryFilter,
      },
    }),
    db.serviceAssignment.aggregate({
      _sum: { hoursMinutes: true },
      where: ministryFilter,
    }),
  ]);

  return success({
    activeVolunteers: active,
    openApplications: applications,
    teams,
    upcomingAssignments: upcoming,
    serviceHoursMinutes: hours._sum.hoursMinutes ?? 0,
  });
}
