import { hasPermission, type AuthUser } from '@/lib/auth/permissions';
import { resolveEventStatusOnSave, type EventStatusValue } from './status';

export const RESERVED_EVENT_SLUGS = new Set([
  'past',
  'create',
  'archive',
  'calendar',
  'categories',
  'locations',
  'register',
  'my',
  'registrations',
]);

export function canPublishEvent(user: AuthUser): boolean {
  return hasPermission(user, 'events', 'publish') || hasPermission(user, 'events', 'manage');
}

export function canArchiveEvent(user: AuthUser): boolean {
  return hasPermission(user, 'events', 'archive') || hasPermission(user, 'events', 'manage');
}

export function canCancelEvent(user: AuthUser): boolean {
  return (
    hasPermission(user, 'events', 'cancel') ||
    hasPermission(user, 'events', 'archive') ||
    hasPermission(user, 'events', 'manage')
  );
}

export function canDeleteEvent(user: AuthUser): boolean {
  return hasPermission(user, 'events', 'delete') || hasPermission(user, 'events', 'manage');
}

export function allowedEventStatus(user: AuthUser, requested?: EventStatusValue | null): EventStatusValue {
  const status = requested || 'draft';
  if ((status === 'published' || status === 'scheduled') && !canPublishEvent(user)) return 'draft';
  if (status === 'archived' && !canArchiveEvent(user)) return 'draft';
  if (status === 'cancelled' && !canCancelEvent(user)) return 'draft';
  return status;
}

export function resolveEventWrite(
  user: AuthUser,
  input: { status?: EventStatusValue | null; publishAt?: Date | null }
) {
  return resolveEventStatusOnSave({
    status: allowedEventStatus(user, input.status),
    publishAt: input.publishAt ?? null,
  });
}

export function eventWhereForUser(user: AuthUser): Record<string, unknown> | undefined {
  if (user.role.slug === 'ministry_leader') {
    return { ministry: { leaderUserId: user.id } };
  }
  return undefined;
}

export function canMutateEventRecord(
  user: AuthUser,
  event: { ministry?: { leaderUserId: string | null } | null; ministryId?: string | null }
): boolean {
  if (user.role.slug !== 'ministry_leader') return true;
  return event.ministry?.leaderUserId === user.id;
}
