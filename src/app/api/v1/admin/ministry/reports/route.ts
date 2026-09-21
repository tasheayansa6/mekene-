import { db } from '@/lib/db';
import { forbidden, success, validationError } from '@/lib/api/response';
import { guardAdminRead } from '@/lib/admin/guard';
import {
  applicationListWhere,
  assignmentListWhere,
  canManageAssignments,
  canViewVolunteers,
  teamListWhere,
} from '@/lib/volunteers/access';
import {
  applicationStatusLabel,
  assignmentStatusLabel,
  volunteerStatusLabel,
} from '@/lib/volunteers/status';
import { formatZodErrors, reportsQuerySchema } from '@/lib/volunteers/validation';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'ministries', 'view');
  if (!auth.ok) return auth.error;
  if (!canViewVolunteers(auth.user) && !canManageAssignments(auth.user)) {
    return forbidden();
  }

  const url = new URL(request.url);
  const parsed = reportsQuerySchema.safeParse({
    from: url.searchParams.get('from') || undefined,
    to: url.searchParams.get('to') || undefined,
    ministryId: url.searchParams.get('ministryId') || undefined,
  });
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const to = parsed.data.to ? new Date(parsed.data.to) : new Date();
  const from = parsed.data.from
    ? new Date(parsed.data.from)
    : new Date(to.getTime() - 90 * 24 * 60 * 60_000);

  const ministryFilter = parsed.data.ministryId
    ? { ministryId: parsed.data.ministryId }
    : {};

  const [applications, assignments, profiles, teams, hours, substitutions, openApps] = await Promise.all([
    db.volunteerApplication.findMany({
      where: {
        AND: [
          applicationListWhere(auth.user),
          ministryFilter,
          { createdAt: { gte: from, lte: to } },
        ],
      },
      select: { status: true },
    }),
    db.serviceAssignment.findMany({
      where: {
        AND: [
          assignmentListWhere(auth.user),
          ministryFilter,
          { scheduledAt: { gte: from, lte: to } },
        ],
      },
      select: { status: true },
    }),
    db.volunteerProfile.findMany({
      where:
        auth.user.role.slug === 'ministry_leader'
          ? {
              member: {
                ministries: { some: { ministry: { leaderUserId: auth.user.id } } },
              },
            }
          : {},
      select: { status: true },
    }),
    db.ministryTeam.count({
      where: {
        AND: [teamListWhere(auth.user), ministryFilter],
      },
    }),
    db.serviceAssignment.aggregate({
      where: {
        AND: [
          assignmentListWhere(auth.user),
          ministryFilter,
          { scheduledAt: { gte: from, lte: to } },
        ],
      },
      _sum: { hoursMinutes: true },
    }),
    db.volunteerSubstitution.count({
      where: {
        createdAt: { gte: from, lte: to },
        assignment: assignmentListWhere(auth.user),
      },
    }),
    db.volunteerApplication.count({
      where: {
        AND: [
          applicationListWhere(auth.user),
          ministryFilter,
          { status: { in: ['submitted', 'under_review', 'more_info'] } },
        ],
      },
    }),
  ]);

  const appsByStatus = new Map<string, number>();
  for (const row of applications) {
    appsByStatus.set(row.status, (appsByStatus.get(row.status) || 0) + 1);
  }

  const assignmentsByStatus = new Map<string, number>();
  for (const row of assignments) {
    assignmentsByStatus.set(row.status, (assignmentsByStatus.get(row.status) || 0) + 1);
  }

  const profilesByStatus = new Map<string, number>();
  for (const row of profiles) {
    profilesByStatus.set(row.status, (profilesByStatus.get(row.status) || 0) + 1);
  }

  return success({
    range: { from: from.toISOString(), to: to.toISOString() },
    totals: {
      applications: applications.length,
      assignments: assignments.length,
      volunteers: profiles.length,
      teams,
      serviceHoursMinutes: hours._sum.hoursMinutes ?? 0,
      substitutions,
      openApplications: openApps,
    },
    applicationsByStatus: [...appsByStatus.entries()].map(([status, count]) => ({
      status,
      label: applicationStatusLabel(status),
      count,
    })),
    assignmentsByStatus: [...assignmentsByStatus.entries()].map(([status, count]) => ({
      status,
      label: assignmentStatusLabel(status),
      count,
    })),
    volunteersByStatus: [...profilesByStatus.entries()].map(([status, count]) => ({
      status,
      label: volunteerStatusLabel(status),
      count,
    })),
  });
}
