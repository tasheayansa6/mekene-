import { hasPermission, type AuthUser } from '@/lib/auth/permissions';
import type { CmsStatusValue } from './status';

export function canPublishContent(user: AuthUser): boolean {
  return hasPermission(user, 'content', 'publish') || hasPermission(user, 'content', 'manage');
}

export function canArchiveContent(user: AuthUser): boolean {
  return hasPermission(user, 'content', 'archive') || hasPermission(user, 'content', 'manage');
}

export function canDeleteContent(user: AuthUser): boolean {
  return hasPermission(user, 'content', 'delete') || hasPermission(user, 'content', 'manage');
}

export function allowedWriteStatus(user: AuthUser, requested?: CmsStatusValue | null): CmsStatusValue {
  const status = requested || 'draft';
  if (status === 'published' || status === 'scheduled') {
    if (!canPublishContent(user)) return 'draft';
  }
  if (status === 'archived' && !canArchiveContent(user)) {
    return 'draft';
  }
  return status;
}
