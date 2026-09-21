import { db } from '@/lib/db';
import { forbidden, success } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';
import { serializeAssignment, serializeTeam, teamInclude } from '@/lib/volunteers/serialize';
import { assignmentScopeWhere, volunteerLeaderScope } from '@/lib/volunteers/scope';
import { canManageAssignments, canViewVolunteers, isTeamLeader } from '@/lib/volunteers/access';

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const scope = await volunteerLeaderScope(auth.user);
  const canLead =
    scope.teamIds.length > 0 ||
    canViewVolunteers(auth.user) ||
    canManageAssignments(auth.user);
  if (!canLead) return forbidden();

  const now = new Date();
  const where = assignmentScopeWhere(scope);

  const [teams, upcoming, substitutions, applications, openRoles] = await Promise.all([
    db.ministryTeam.findMany({
      where: scope.isGlobal ? { isActive: true } : { id: { in: scope.teamIds } },
      include: teamInclude,
      orderBy: { name: 'asc' },
      take: 50,
    }),
    db.serviceAssignment.findMany({
      where: {
        AND: [where, { scheduledAt: { gte: now }, status: { in: ['proposed', 'assigned', 'confirmed'] } }],
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
        event: { select: { id: true, title: true, slug: true, startAt: true, endAt: true } },
        ministry: { select: { id: true, name: true, slug: true, leaderUserId: true } },
        team: {
          select: {
            id: true,
            name: true,
            slug: true,
            leaderUserId: true,
            assistantLeaderUserId: true,
          },
        },
      },
      orderBy: { scheduledAt: 'asc' },
      take: 40,
    }),
    db.volunteerSubstitution.findMany({
      where: {
        status: 'requested',
        assignment: where,
      },
      include: {
        assignment: {
          select: { id: true, roleName: true, scheduledAt: true, teamId: true, ministryId: true },
        },
      },
      take: 20,
    }),
    db.volunteerApplication.findMany({
      where: {
        status: { in: ['submitted', 'under_review', 'more_info'] },
        ...(scope.isGlobal ? {} : { ministryId: { in: scope.ministryIds } }),
      },
      select: { id: true, status: true, preferredMinistry: true, submittedAt: true, ministryId: true },
      take: 20,
    }),
    db.volunteerRole.findMany({
      where: {
        isActive: true,
        ...(scope.isGlobal ? {} : { ministryId: { in: scope.ministryIds } }),
      },
      take: 40,
    }),
  ]);

  return success({
    teams: teams.map((row) => ({
      ...serializeTeam(row),
      canManage: scope.isGlobal || isTeamLeader(auth.user, row),
    })),
    upcoming: upcoming.map(serializeAssignment),
    substitutions: substitutions.map((row) => ({
      id: row.id,
      status: row.status,
      reason: row.reason,
      assignmentId: row.assignmentId,
      originalMemberId: row.originalMemberId,
      scheduledAt: row.assignment.scheduledAt.toISOString(),
      roleName: row.assignment.roleName,
    })),
    applications,
    roles: openRoles,
  });
}
