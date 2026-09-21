import { hasPermission, type AuthUser } from '@/lib/auth/permissions';

export function canManageRegistrations(user: AuthUser): boolean {
  return (
    hasPermission(user, 'events', 'assign') ||
    hasPermission(user, 'events', 'moderate') ||
    hasPermission(user, 'events', 'manage')
  );
}

export function canManageCapacity(user: AuthUser): boolean {
  return hasPermission(user, 'events', 'moderate') || hasPermission(user, 'events', 'manage');
}

export function canViewEventReports(user: AuthUser): boolean {
  return hasPermission(user, 'events', 'view') || hasPermission(user, 'events', 'manage');
}

export function canExportEvents(user: AuthUser): boolean {
  return hasPermission(user, 'events', 'manage');
}

export function canManageInvitations(user: AuthUser): boolean {
  return (
    hasPermission(user, 'events', 'assign') ||
    hasPermission(user, 'events', 'manage')
  );
}

export {
  canPublishEvent,
  canArchiveEvent,
  canCancelEvent,
  canDeleteEvent,
  canMutateEventRecord,
  eventWhereForUser,
  allowedEventStatus,
  resolveEventWrite,
  RESERVED_EVENT_SLUGS,
} from './access';
