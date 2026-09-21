import { db } from '@/lib/db';
import type { AuthUser } from '@/lib/auth/permissions';
import { canViewVolunteers } from './access';

export async function volunteerLeaderScope(user: AuthUser) {
  const isGlobal =
    canViewVolunteers(user) &&
    user.role.slug !== 'ministry_leader' &&
    user.role.slug !== 'member';

  const ledTeams = await db.ministryTeam.findMany({
    where: isGlobal
      ? {}
      : {
          OR: [
            { leaderUserId: user.id },
            { assistantLeaderUserId: user.id },
            ...(user.role.slug === 'ministry_leader'
              ? [{ ministry: { leaderUserId: user.id } }]
              : []),
          ],
        },
    select: {
      id: true,
      ministryId: true,
      name: true,
      leaderUserId: true,
      assistantLeaderUserId: true,
      ministry: { select: { id: true, name: true, leaderUserId: true } },
    },
    take: 200,
  });

  return {
    isGlobal,
    teams: ledTeams,
    teamIds: ledTeams.map((row) => row.id),
    ministryIds: [...new Set(ledTeams.map((row) => row.ministryId))],
  };
}

export function assignmentScopeWhere(scope: Awaited<ReturnType<typeof volunteerLeaderScope>>) {
  if (scope.isGlobal) return {};
  if (scope.teamIds.length === 0 && scope.ministryIds.length === 0) {
    return { id: '__none__' };
  }
  return {
    OR: [
      ...(scope.teamIds.length ? [{ teamId: { in: scope.teamIds } }] : []),
      ...(scope.ministryIds.length ? [{ ministryId: { in: scope.ministryIds } }] : []),
    ],
  };
}
