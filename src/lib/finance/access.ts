import { hasPermission, type AuthUser } from '@/lib/auth/permissions';

export function canViewFinance(user: AuthUser): boolean {
  return hasPermission(user, 'finance', 'view') || hasPermission(user, 'finance', 'manage');
}

export function canCreateExpense(user: AuthUser): boolean {
  return hasPermission(user, 'finance', 'create') || hasPermission(user, 'finance', 'manage');
}

export function canUpdateExpense(user: AuthUser): boolean {
  return hasPermission(user, 'finance', 'update') || hasPermission(user, 'finance', 'manage');
}

export function canApproveExpense(user: AuthUser): boolean {
  return hasPermission(user, 'finance', 'moderate') || hasPermission(user, 'finance', 'manage');
}

export function canPayExpense(user: AuthUser): boolean {
  return hasPermission(user, 'finance', 'manage');
}

export function canManageBudgets(user: AuthUser): boolean {
  return (
    hasPermission(user, 'finance', 'create') ||
    hasPermission(user, 'finance', 'update') ||
    hasPermission(user, 'finance', 'manage')
  );
}

export function canReconcile(user: AuthUser): boolean {
  return hasPermission(user, 'finance', 'manage');
}

export function canExportFinance(user: AuthUser): boolean {
  return hasPermission(user, 'finance', 'manage');
}

/**
 * Separation of duties: submitter cannot approve their own expense
 * unless they hold finance:manage.
 */
export function canApproveThisExpense(
  user: AuthUser,
  expense: { submittedById: string }
): boolean {
  if (!canApproveExpense(user)) return false;
  if (expense.submittedById === user.id && !hasPermission(user, 'finance', 'manage')) {
    return false;
  }
  return true;
}
