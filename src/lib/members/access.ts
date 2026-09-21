import { hasPermission, type AuthUser } from '@/lib/auth/permissions';
import type { Prisma } from '@prisma/client';

export function canViewMembers(user: AuthUser): boolean {
  return hasPermission(user, 'members', 'view') || hasPermission(user, 'members', 'manage');
}

export function canCreateMembers(user: AuthUser): boolean {
  return hasPermission(user, 'members', 'create') || hasPermission(user, 'members', 'manage');
}

export function canUpdateMembers(user: AuthUser): boolean {
  return hasPermission(user, 'members', 'update') || hasPermission(user, 'members', 'manage');
}

export function canArchiveMembers(user: AuthUser): boolean {
  return hasPermission(user, 'members', 'archive') || hasPermission(user, 'members', 'manage');
}

export function canApproveMembership(user: AuthUser): boolean {
  return hasPermission(user, 'members', 'approve') || hasPermission(user, 'members', 'manage');
}

export function canModerateApplications(user: AuthUser): boolean {
  return (
    hasPermission(user, 'members', 'moderate') ||
    hasPermission(user, 'members', 'approve') ||
    hasPermission(user, 'members', 'manage')
  );
}

export function canManageHouseholds(user: AuthUser): boolean {
  return hasPermission(user, 'members', 'manage');
}

export function canManageMemberMinistries(user: AuthUser): boolean {
  return (
    hasPermission(user, 'members', 'update') ||
    hasPermission(user, 'members', 'manage')
  );
}

export function canExportMembers(user: AuthUser): boolean {
  return hasPermission(user, 'members', 'export') || hasPermission(user, 'members', 'manage');
}

export function canImportMembers(user: AuthUser): boolean {
  return hasPermission(user, 'members', 'import') || hasPermission(user, 'members', 'manage');
}

export function canMergeMembers(user: AuthUser): boolean {
  return hasPermission(user, 'members', 'manage');
}

export function canManageBaptism(user: AuthUser): boolean {
  return (
    hasPermission(user, 'members', 'moderate') ||
    hasPermission(user, 'members', 'manage') ||
    hasPermission(user, 'pastoral', 'moderate') ||
    hasPermission(user, 'pastoral', 'manage')
  );
}

export function canManageTransfers(user: AuthUser): boolean {
  return (
    hasPermission(user, 'members', 'approve') ||
    hasPermission(user, 'members', 'manage')
  );
}

export function canViewBaptism(user: AuthUser): boolean {
  return canManageBaptism(user) || hasPermission(user, 'members', 'view');
}

export function canIssueMemberCards(user: AuthUser): boolean {
  return (
    hasPermission(user, 'members', 'update') ||
    hasPermission(user, 'members', 'manage')
  );
}

export function canVerifyMemberCards(user: AuthUser): boolean {
  return canViewMembers(user) || hasPermission(user, 'attendance', 'create');
}

export function isMinistryLeaderScope(user: AuthUser): boolean {
  return user.role.slug === 'ministry_leader' && !hasPermission(user, 'members', 'manage');
}

/**
 * Ministry leaders may only see members who participate in ministries they lead.
 * Approval and application queues remain closed without moderate/approve.
 */
export function memberListWhere(user: AuthUser): Prisma.MemberWhereInput {
  if (!isMinistryLeaderScope(user)) return {};
  return {
    ministries: {
      some: {
        ministry: { leaderUserId: user.id },
      },
    },
  };
}

export function memberByIdWhere(user: AuthUser, id: string): Prisma.MemberWhereInput {
  return { id, ...memberListWhere(user) };
}
