import { hasPermission, type AuthUser } from '@/lib/auth/permissions';
import {
  canMutateMinistry,
  canViewMinistry,
  ministryWhereForUser,
  type MinistryScopeRecord,
} from '@/lib/admin/ministry-scope';
import type { Prisma } from '@prisma/client';

export function canViewStaff(user: AuthUser): boolean {
  return hasPermission(user, 'staff', 'view') || hasPermission(user, 'staff', 'manage');
}

export function canManageStaff(user: AuthUser): boolean {
  return (
    hasPermission(user, 'staff', 'create') ||
    hasPermission(user, 'staff', 'update') ||
    hasPermission(user, 'staff', 'manage') ||
    hasPermission(user, 'staff', 'archive')
  );
}

export function canCreateStaff(user: AuthUser): boolean {
  return hasPermission(user, 'staff', 'create') || hasPermission(user, 'staff', 'manage');
}

export function canUpdateStaff(user: AuthUser): boolean {
  return hasPermission(user, 'staff', 'update') || hasPermission(user, 'staff', 'manage');
}

export function canViewVolunteers(user: AuthUser): boolean {
  return (
    hasPermission(user, 'volunteers', 'view') || hasPermission(user, 'volunteers', 'manage')
  );
}

export function canApproveVolunteers(user: AuthUser): boolean {
  return (
    hasPermission(user, 'volunteers', 'approve') ||
    hasPermission(user, 'volunteers', 'manage')
  );
}

export function canManageVolunteers(user: AuthUser): boolean {
  return (
    hasPermission(user, 'volunteers', 'create') ||
    hasPermission(user, 'volunteers', 'update') ||
    hasPermission(user, 'volunteers', 'manage')
  );
}

export function canManageAssignments(user: AuthUser): boolean {
  return (
    hasPermission(user, 'ministries', 'assign') ||
    hasPermission(user, 'volunteers', 'manage') ||
    hasPermission(user, 'ministries', 'manage')
  );
}

export function canViewVolunteerReports(user: AuthUser): boolean {
  return canViewVolunteers(user) || canManageAssignments(user);
}

export function canCorrectVolunteerHours(user: AuthUser): boolean {
  return canManageAssignments(user) || hasPermission(user, 'volunteers', 'manage');
}

/**
 * Object-level ministry access for scoped leaders.
 * Reuses ministry-scope: ministry_leader only when leaderUserId === user.id.
 */
export function canAccessMinistry(
  user: AuthUser,
  ministry: MinistryScopeRecord
): boolean {
  return canViewMinistry(user, ministry);
}

export function canMutateScopedMinistry(
  user: AuthUser,
  ministry: MinistryScopeRecord
): boolean {
  return canMutateMinistry(user, ministry);
}

export { ministryWhereForUser };

/** List filter for ministry-scoped volunteer/ministry resources. */
export function ministryScopedWhere(
  user: AuthUser
): Prisma.MinistryWhereInput | undefined {
  const scope = ministryWhereForUser(user);
  return scope as Prisma.MinistryWhereInput | undefined;
}

export type TeamLeaderFields = {
  id: string;
  leaderUserId: string | null;
  assistantLeaderUserId?: string | null;
  ministry: MinistryScopeRecord;
};

export function isTeamLeader(user: AuthUser, team: TeamLeaderFields): boolean {
  return team.leaderUserId === user.id || team.assistantLeaderUserId === user.id;
}

export function applicationListWhere(
  user: AuthUser
): Prisma.VolunteerApplicationWhereInput {
  if (user.role.slug === 'ministry_leader') {
    return { ministry: { leaderUserId: user.id } };
  }
  return {};
}

export function teamListWhere(user: AuthUser): Prisma.MinistryTeamWhereInput {
  if (user.role.slug === 'ministry_leader') {
    return { ministry: { leaderUserId: user.id } };
  }
  return {};
}

export function assignmentListWhere(
  user: AuthUser
): Prisma.ServiceAssignmentWhereInput {
  if (user.role.slug === 'ministry_leader') {
    return { ministry: { leaderUserId: user.id } };
  }
  return {};
}

export function trainingProgramListWhere(
  user: AuthUser
): Prisma.TrainingProgramWhereInput {
  if (user.role.slug === 'ministry_leader') {
    return {
      OR: [{ ministryId: null }, { ministry: { leaderUserId: user.id } }],
    };
  }
  return {};
}

export function canAccessApplication(
  user: AuthUser,
  application: { ministryId: string | null; ministry?: MinistryScopeRecord | null }
): boolean {
  if (!canViewVolunteers(user)) return false;
  if (user.role.slug !== 'ministry_leader') return true;
  if (!application.ministry) {
    return application.ministryId == null ? false : false;
  }
  return application.ministry.leaderUserId === user.id;
}

export function canAccessTeam(user: AuthUser, team: TeamLeaderFields): boolean {
  if (isTeamLeader(user, team)) return true;
  if (!canViewVolunteers(user) && !hasPermission(user, 'ministries', 'view')) {
    return false;
  }
  return canAccessMinistry(user, team.ministry);
}

export function canManageTeam(user: AuthUser, team: TeamLeaderFields): boolean {
  if (isTeamLeader(user, team)) return true;
  if (!canManageAssignments(user) && !canManageVolunteers(user)) return false;
  return canAccessTeam(user, team);
}

export function canAccessAssignment(
  user: AuthUser,
  assignment: {
    ministry?: MinistryScopeRecord | null;
    ministryId?: string | null;
    team?: TeamLeaderFields | null;
    member?: { userId?: string | null } | null;
    memberId?: string;
  }
): boolean {
  if (assignment.team && isTeamLeader(user, assignment.team)) return true;
  if (!canViewVolunteers(user) && !canManageAssignments(user)) return false;
  if (user.role.slug !== 'ministry_leader') return true;
  if (!assignment.ministry) return false;
  return assignment.ministry.leaderUserId === user.id;
}

export function canManageAssignment(
  user: AuthUser,
  assignment: {
    ministry?: MinistryScopeRecord | null;
    team?: TeamLeaderFields | null;
  }
): boolean {
  if (assignment.team && isTeamLeader(user, assignment.team)) return true;
  if (!canManageAssignments(user)) return false;
  return canAccessAssignment(user, assignment);
}

/**
 * Availability is private: owner, authorized scheduler, or authorized ministry/team leader.
 */
export function canViewAvailability(
  user: AuthUser,
  ownerUserId: string,
  ministry?: MinistryScopeRecord | null,
  team?: TeamLeaderFields | null
): boolean {
  if (user.id === ownerUserId) return true;
  if (team && isTeamLeader(user, team)) return true;
  if (!canViewVolunteers(user) && !canManageAssignments(user)) return false;
  if (user.role.slug === 'ministry_leader') {
    return Boolean(ministry && ministry.leaderUserId === user.id);
  }
  return true;
}

export function canViewServiceHistory(
  user: AuthUser,
  ownerUserId: string,
  ministry?: MinistryScopeRecord | null,
  team?: TeamLeaderFields | null
): boolean {
  if (user.id === ownerUserId) return true;
  return canAccessAssignment(user, { ministry, team });
}
