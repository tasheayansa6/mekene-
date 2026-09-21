import { canAccessAdminPortal, hasPermission, type AuthUser } from '@/lib/auth/permissions';
import type { PrayerStatusValue } from './status';

export function canViewPrayerAdmin(user: AuthUser): boolean {
  return canAccessAdminPortal(user) && hasPermission(user, 'prayer', 'view');
}

export function canModeratePrayer(user: AuthUser): boolean {
  return canAccessAdminPortal(user) && hasPermission(user, 'prayer', 'moderate');
}

export function canAssignPrayer(user: AuthUser): boolean {
  return canAccessAdminPortal(user) && hasPermission(user, 'prayer', 'assign');
}

export function canArchivePrayer(user: AuthUser): boolean {
  return canAccessAdminPortal(user) && hasPermission(user, 'prayer', 'archive');
}

export function canUpdatePrayer(user: AuthUser): boolean {
  return canAccessAdminPortal(user) && hasPermission(user, 'prayer', 'update');
}

export function canManagePrayerCategories(user: AuthUser): boolean {
  return (
    canAccessAdminPortal(user) &&
    (hasPermission(user, 'prayer', 'manage') || hasPermission(user, 'prayer', 'moderate'))
  );
}

export function canSeeRequesterIdentity(user: AuthUser): boolean {
  return canModeratePrayer(user) || hasPermission(user, 'prayer', 'manage');
}

export function canPermanentlyDeletePrayer(user: AuthUser): boolean {
  return user.role.slug === 'super_admin';
}

export function canSetPrayerStatus(user: AuthUser, status: PrayerStatusValue): boolean {
  return allowedTeamStatus(user, status) !== null;
}

export const TEAM_UPDATE_STATUSES: PrayerStatusValue[] = ['assigned', 'praying', 'answered'];

export function allowedTeamStatus(user: AuthUser, requested: PrayerStatusValue): PrayerStatusValue | null {
  if (canModeratePrayer(user)) return requested;
  if (requested === 'archived' && canArchivePrayer(user)) return requested;
  if (TEAM_UPDATE_STATUSES.includes(requested) && canUpdatePrayer(user)) return requested;
  return null;
}

/** Admin list/detail: only users who can enter the admin portal with prayer.view. */
export function prayerAdminWhere(_user: AuthUser): Record<string, unknown> | undefined {
  return undefined;
}
