import { hasPermission, type AuthUser } from '@/lib/auth/permissions';

export function canViewGiving(user: AuthUser): boolean {
  return hasPermission(user, 'giving', 'view') || hasPermission(user, 'giving', 'manage');
}

export function canCreateGiving(user: AuthUser): boolean {
  return hasPermission(user, 'giving', 'create') || hasPermission(user, 'giving', 'manage');
}

export function canUpdateGiving(user: AuthUser): boolean {
  return hasPermission(user, 'giving', 'update') || hasPermission(user, 'giving', 'manage');
}

export function canManageCampaigns(user: AuthUser): boolean {
  return hasPermission(user, 'giving', 'publish') || hasPermission(user, 'giving', 'manage');
}

export function canManagePayments(user: AuthUser): boolean {
  return hasPermission(user, 'giving', 'moderate') || hasPermission(user, 'giving', 'manage');
}

export function canManageRefunds(user: AuthUser): boolean {
  return hasPermission(user, 'giving', 'cancel') || hasPermission(user, 'giving', 'manage');
}

export function canExportGiving(user: AuthUser): boolean {
  return hasPermission(user, 'giving', 'manage');
}

export function canViewGivingReports(user: AuthUser): boolean {
  return canViewGiving(user);
}

/** Alias for finance report viewers who already have giving access. */
export function canViewFinanceReports(user: AuthUser): boolean {
  return (
    canViewGiving(user) ||
    hasPermission(user, 'finance', 'view') ||
    hasPermission(user, 'finance', 'manage')
  );
}
