import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { slugify, uniqueSlug } from '@/lib/admin/slug';
import { error } from '@/lib/api/response';
import type { AuthUser } from '@/lib/auth/permissions';
import { allowedWriteStatus } from './access';
import { emitContentEvent, type ContentEventType } from './events';
import { enforceFeaturedLimit } from './query';
import { isSafePublicUrl, sanitizeMarkdown, sanitizePlainText } from './sanitize';
import { RESERVED_PAGE_SLUGS, resolveStatusOnSave, type CmsStatusValue } from './status';
import { RESERVED_SERMON_SLUGS } from '@/lib/sermons/access';
import { RESERVED_EVENT_SLUGS } from '@/lib/events/access';
import { RESERVED_ALBUM_SLUGS } from '@/lib/gallery/access';

export function revalidatePublicContent(paths: string[] = []) {
  const defaults = ['/', '/news', '/announcements', '/resources', '/search', '/pages', '/sermons', '/events', '/prayer', '/gallery'];
  for (const path of [...defaults, ...paths]) {
    revalidatePath(path);
  }
}

export async function uniqueContentSlug(
  model: 'cmsPage' | 'newsArticle' | 'announcement' | 'resource' | 'contentCategory' | 'contentTag' | 'sermon' | 'sermonSeries' | 'sermonCategory' | 'event' | 'eventCategory' | 'eventLocation' | 'prayerCategory' | 'galleryAlbum' | 'galleryCategory' | 'galleryMediaItem',
  title: string,
  requested?: string | null,
  excludeId?: string
) {
  const base = requested?.trim() || title;
  return uniqueSlug(base, async (candidate) => {
    if (model === 'sermon' && RESERVED_SERMON_SLUGS.has(candidate)) return true;
    if (model === 'event' && RESERVED_EVENT_SLUGS.has(candidate)) return true;
    if (model === 'galleryAlbum' && RESERVED_ALBUM_SLUGS.has(candidate)) return true;
    const row = await (db[model] as {
      findFirst: (args: unknown) => Promise<{ id: string } | null>;
    }).findFirst({
      where: excludeId ? { slug: candidate, id: { not: excludeId } } : { slug: candidate },
      select: { id: true },
    });
    return Boolean(row);
  });
}

export function parseDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function sanitizeOptionalUrl(value?: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!isSafePublicUrl(trimmed)) {
    throw new Error('unsafe-url');
  }
  return trimmed;
}

export function resolveWriteStatus(user: AuthUser, input: {
  status?: CmsStatusValue | null;
  publishAt?: Date | null;
}) {
  const allowed = allowedWriteStatus(user, input.status);
  return resolveStatusOnSave({ status: allowed, publishAt: input.publishAt ?? null });
}

export function reservedPageError(slug: string) {
  if (RESERVED_PAGE_SLUGS.has(slug)) {
    return error('That slug is reserved for an existing website page. Choose another URL.', 409);
  }
  return null;
}

export function unsafeUrlError() {
  return error('Images and links must use http(s) or an uploaded file path.', 422);
}

export function eventForStatusChange(
  previous: string,
  next: string
): ContentEventType {
  if (next === 'published' && previous !== 'published') return 'content.published';
  if (previous === 'published' && next !== 'published' && next !== 'archived') {
    return 'content.unpublished';
  }
  if (next === 'archived') return 'content.archived';
  return 'content.updated';
}

export async function logContentChange(options: {
  type: ContentEventType;
  entity: string;
  entityId: string;
  userId: string;
  request: Request;
  details?: Record<string, unknown>;
}) {
  await emitContentEvent(options);
}

export function eventForSermonStatus(previous: string, next: string): ContentEventType {
  if (next === 'published' && previous !== 'published') return 'sermon.published';
  if (previous === 'published' && next !== 'published' && next !== 'archived') {
    return 'sermon.unpublished';
  }
  if (next === 'archived') return 'sermon.archived';
  return 'sermon.updated';
}

export function eventForEventStatus(previous: string, next: string): ContentEventType {
  if (next === 'cancelled' && previous !== 'cancelled') return 'event.cancelled';
  if (next === 'published' && previous !== 'published') return 'event.published';
  if (previous === 'published' && next !== 'published' && next !== 'archived' && next !== 'cancelled') {
    return 'event.unpublished';
  }
  if (next === 'archived') return 'event.archived';
  return 'event.updated';
}

export { slugify, sanitizeMarkdown, sanitizePlainText, enforceFeaturedLimit };
