import { hasPermission, type AuthUser } from '@/lib/auth/permissions';

export interface MinistryScopeRecord {
  id: string;
  leaderUserId: string | null;
}

export function ministryWhereForUser(user: AuthUser): Record<string, unknown> | undefined {
  if (user.role.slug === 'ministry_leader') {
    return { leaderUserId: user.id };
  }
  return undefined;
}

export function canViewMinistry(user: AuthUser, ministry: MinistryScopeRecord): boolean {
  if (!hasPermission(user, 'ministries', 'view')) return false;
  if (user.role.slug === 'ministry_leader') {
    return ministry.leaderUserId === user.id;
  }
  return true;
}

export function canMutateMinistry(user: AuthUser, ministry: MinistryScopeRecord): boolean {
  if (!hasPermission(user, 'ministries', 'update') && !hasPermission(user, 'ministries', 'manage')) {
    return false;
  }
  if (user.role.slug === 'ministry_leader') {
    return ministry.leaderUserId === user.id;
  }
  return true;
}

export function canChangeMinistryStatus(user: AuthUser): boolean {
  return (
    hasPermission(user, 'ministries', 'publish') ||
    hasPermission(user, 'ministries', 'archive') ||
    hasPermission(user, 'ministries', 'manage')
  );
}
