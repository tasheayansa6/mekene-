export const GALLERY_STATUSES = ['draft', 'review', 'published', 'archived'] as const;
export type GalleryStatusValue = (typeof GALLERY_STATUSES)[number];

export const PUBLIC_GALLERY_STATUS = 'published' as const;
export const FEATURED_ALBUM_LIMIT = 3;
export const MAX_MEDIA_PAGE_SIZE = 48;
export const MAX_GALLERY_UPLOADS = 12;

export function isGalleryPubliclyVisible(
  item: { status: string; publishAt?: Date | null },
  now = new Date()
) {
  if (item.status !== 'published') return false;
  if (item.publishAt && item.publishAt > now) return false;
  return true;
}

export function publicGalleryWhere(now = new Date()) {
  return {
    status: PUBLIC_GALLERY_STATUS,
    AND: [{ OR: [{ publishAt: null }, { publishAt: { lte: now } }] }],
  };
}

export function publicMediaWhere() {
  return { status: PUBLIC_GALLERY_STATUS };
}

export function resolveGalleryStatusOnSave(input: {
  status?: GalleryStatusValue;
  publishAt?: Date | null;
  now?: Date;
}): { status: GalleryStatusValue; publishedAt: Date | null } {
  const now = input.now ?? new Date();
  let status = input.status || 'draft';
  if (status === 'published' && input.publishAt && input.publishAt > now) {
    status = 'review';
  }
  const publishedAt = status === 'published' ? now : null;
  return { status, publishedAt };
}
