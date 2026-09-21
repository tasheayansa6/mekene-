import { hasPermission, type AuthUser } from '@/lib/auth/permissions';
import type { Prisma } from '@prisma/client';

export function canViewPastoral(user: AuthUser): boolean {
  return hasPermission(user, 'pastoral', 'view') || hasPermission(user, 'pastoral', 'manage');
}

export function canCreate(user: AuthUser): boolean {
  return hasPermission(user, 'pastoral', 'create') || hasPermission(user, 'pastoral', 'manage');
}

export const canCreatePastoral = canCreate;

export function canUpdate(user: AuthUser): boolean {
  return hasPermission(user, 'pastoral', 'update') || hasPermission(user, 'pastoral', 'manage');
}

export const canUpdatePastoral = canUpdate;

export function canAssign(user: AuthUser): boolean {
  return hasPermission(user, 'pastoral', 'assign') || hasPermission(user, 'pastoral', 'manage');
}

export const canAssignPastoral = canAssign;

/** Notes require pastoral:moderate or pastoral:manage (admin matrix has neither for notes). */
export function canManageNotes(user: AuthUser): boolean {
  return hasPermission(user, 'pastoral', 'moderate') || hasPermission(user, 'pastoral', 'manage');
}

export function canManageVisits(user: AuthUser): boolean {
  return (
    hasPermission(user, 'pastoral', 'update') ||
    hasPermission(user, 'pastoral', 'create') ||
    hasPermission(user, 'pastoral', 'manage')
  );
}

export function canManageFollowUps(user: AuthUser): boolean {
  return (
    hasPermission(user, 'pastoral', 'update') ||
    hasPermission(user, 'pastoral', 'create') ||
    hasPermission(user, 'pastoral', 'manage')
  );
}

export function canManageCategories(user: AuthUser): boolean {
  return hasPermission(user, 'pastoral', 'manage');
}

export function canSeeAllCases(user: AuthUser): boolean {
  return hasPermission(user, 'pastoral', 'manage');
}

/**
 * Object-level list filter: manage sees all; others with view only see
 * cases assigned to them or created by them.
 */
export function caseListWhere(user: AuthUser): Prisma.PastoralCareCaseWhereInput {
  if (canSeeAllCases(user)) return {};
  return {
    OR: [{ assignedToId: user.id }, { createdById: user.id }],
  };
}

export function canAccessCase(
  user: AuthUser,
  careCase: { assignedToId: string | null; createdById: string }
): boolean {
  if (!canViewPastoral(user)) return false;
  if (canSeeAllCases(user)) return true;
  return careCase.assignedToId === user.id || careCase.createdById === user.id;
}

export function visitListWhere(user: AuthUser): Prisma.PastoralVisitWhereInput {
  if (canSeeAllCases(user)) return {};
  return {
    OR: [
      { assignedToId: user.id },
      { createdById: user.id },
      {
        case: {
          OR: [{ assignedToId: user.id }, { createdById: user.id }],
        },
      },
    ],
  };
}

export function canAccessVisit(
  user: AuthUser,
  visit: {
    assignedToId: string | null;
    createdById: string;
    case?: { assignedToId: string | null; createdById: string } | null;
  }
): boolean {
  if (!canViewPastoral(user)) return false;
  if (canSeeAllCases(user)) return true;
  if (visit.assignedToId === user.id || visit.createdById === user.id) return true;
  if (visit.case) return canAccessCase(user, visit.case);
  return false;
}

export function followUpListWhere(user: AuthUser): Prisma.PastoralFollowUpWhereInput {
  if (canSeeAllCases(user)) return {};
  return {
    OR: [
      { assignedToId: user.id },
      { createdById: user.id },
      {
        case: {
          OR: [{ assignedToId: user.id }, { createdById: user.id }],
        },
      },
    ],
  };
}

export function canAccessFollowUp(
  user: AuthUser,
  followUp: {
    assignedToId: string | null;
    createdById: string;
    case?: { assignedToId: string | null; createdById: string } | null;
  }
): boolean {
  if (!canViewPastoral(user)) return false;
  if (canSeeAllCases(user)) return true;
  if (followUp.assignedToId === user.id || followUp.createdById === user.id) return true;
  if (followUp.case) return canAccessCase(user, followUp.case);
  return false;
}
