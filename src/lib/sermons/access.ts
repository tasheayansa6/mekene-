import { hasPermission, type AuthUser } from '@/lib/auth/permissions';
import { resolveStatusOnSave, type CmsStatusValue } from '@/lib/content/status';

export const RESERVED_SERMON_SLUGS = new Set(['series', 'category', 'create', 'archive', 'categories']);

export function canPublishSermon(user: AuthUser): boolean {
  return hasPermission(user, 'sermons', 'publish') || hasPermission(user, 'sermons', 'manage');
}

export function canArchiveSermon(user: AuthUser): boolean {
  return hasPermission(user, 'sermons', 'archive') || hasPermission(user, 'sermons', 'manage');
}

export function canDeleteSermon(user: AuthUser): boolean {
  return hasPermission(user, 'sermons', 'delete') || hasPermission(user, 'sermons', 'manage');
}

export function allowedSermonStatus(user: AuthUser, requested?: CmsStatusValue | null): CmsStatusValue {
  const status = requested || 'draft';
  if ((status === 'published' || status === 'scheduled') && !canPublishSermon(user)) {
    return 'draft';
  }
  if (status === 'archived' && !canArchiveSermon(user)) {
    return 'draft';
  }
  return status;
}

export function resolveSermonWrite(
  user: AuthUser,
  input: { status?: CmsStatusValue | null; publishAt?: Date | null }
) {
  return resolveStatusOnSave({
    status: allowedSermonStatus(user, input.status),
    publishAt: input.publishAt ?? null,
  });
}
