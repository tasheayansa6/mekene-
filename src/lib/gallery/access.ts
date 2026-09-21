import { hasPermission, type AuthUser } from '@/lib/auth/permissions';
import { resolveGalleryStatusOnSave, type GalleryStatusValue } from './status';

export const RESERVED_ALBUM_SLUGS = new Set([
  'albums',
  'photos',
  'videos',
  'categories',
  'create',
  'archive',
  'archived',
  'media',
]);

export function canPublishGallery(user: AuthUser): boolean {
  return hasPermission(user, 'gallery', 'publish') || hasPermission(user, 'gallery', 'manage');
}

export function canArchiveGallery(user: AuthUser): boolean {
  return hasPermission(user, 'gallery', 'archive') || hasPermission(user, 'gallery', 'manage');
}

export function canDeleteGallery(user: AuthUser): boolean {
  return hasPermission(user, 'gallery', 'delete') || hasPermission(user, 'gallery', 'manage');
}

export function canManageGalleryCategories(user: AuthUser): boolean {
  return hasPermission(user, 'gallery', 'manage');
}

export function canUploadGallery(user: AuthUser): boolean {
  return (
    hasPermission(user, 'gallery', 'create') ||
    hasPermission(user, 'gallery', 'update') ||
    hasPermission(user, 'gallery', 'manage')
  );
}

export function allowedGalleryStatus(
  user: AuthUser,
  requested?: GalleryStatusValue | null
): GalleryStatusValue {
  const status = requested || 'draft';
  if (status === 'published' && !canPublishGallery(user)) return 'draft';
  if (status === 'archived' && !canArchiveGallery(user)) return 'draft';
  return status;
}

export function resolveGalleryWrite(
  user: AuthUser,
  input: { status?: GalleryStatusValue | null; publishAt?: Date | null }
) {
  return resolveGalleryStatusOnSave({
    status: allowedGalleryStatus(user, input.status),
    publishAt: input.publishAt ?? null,
  });
}

export function isMeaninglessAlt(value?: string | null) {
  const text = (value || '').trim();
  if (!text) return true;
  if (/\.(jpe?g|png|webp|gif|heic|bmp)$/i.test(text)) return true;
  if (/^(img|dsc|dscn|photo|image|screenshot)[_-]?\d+/i.test(text)) return true;
  return false;
}
