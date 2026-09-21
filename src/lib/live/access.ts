import { canAccessAdminPortal, hasPermission, type AuthUser } from '@/lib/auth/permissions';

export function canViewLiveAdmin(user: AuthUser): boolean {
  if (!canAccessAdminPortal(user)) return false;
  return (
    hasPermission(user, 'events', 'manage') ||
    hasPermission(user, 'events', 'moderate') ||
    hasPermission(user, 'media', 'manage')
  );
}

export function canModerateLiveChat(user: AuthUser): boolean {
  if (!canAccessAdminPortal(user)) return false;
  return hasPermission(user, 'events', 'moderate') || hasPermission(user, 'events', 'manage');
}

export function canManageLivePrayer(user: AuthUser): boolean {
  if (!canAccessAdminPortal(user)) return false;
  return (
    hasPermission(user, 'prayer', 'moderate') ||
    hasPermission(user, 'prayer', 'manage') ||
    hasPermission(user, 'events', 'manage')
  );
}

export function canWriteLiveAdmin(user: AuthUser): boolean {
  if (!canAccessAdminPortal(user)) return false;
  return hasPermission(user, 'events', 'manage') || hasPermission(user, 'events', 'moderate');
}
