import type { AuthUser } from '@/lib/auth/permissions';
import { parseDate, sanitizeOptionalUrl, sanitizePlainText } from '@/lib/content/admin-write';
import { parseApprovedVideo } from '@/lib/sermons/video';
import { isMeaninglessAlt, resolveGalleryWrite } from './access';
import type { GalleryStatusValue } from './status';

export function prepareAlbumFields(
  data: {
    title: string;
    description?: string | null;
    categoryId?: string | null;
    eventId?: string | null;
    ministryId?: string | null;
    albumDate?: string | null;
    coverImageUrl?: string | null;
    coverImageAlt?: string | null;
    status?: GalleryStatusValue | null;
    isFeatured?: boolean;
    seoTitle?: string | null;
    seoDescription?: string | null;
    publishAt?: string | null;
  },
  user: AuthUser
) {
  try {
    const coverImageUrl = data.coverImageUrl === undefined ? undefined : sanitizeOptionalUrl(data.coverImageUrl);
    const coverImageAlt = data.coverImageAlt
      ? sanitizePlainText(data.coverImageAlt, 180)
      : data.coverImageAlt === null
        ? null
        : undefined;
    if (coverImageUrl && isMeaninglessAlt(coverImageAlt || '')) {
      return { ok: false as const, errors: { coverImageAlt: ['Provide meaningful cover image alt text.'] } };
    }
    const resolved = resolveGalleryWrite(user, {
      status: data.status,
      publishAt: parseDate(data.publishAt),
    });
    return {
      ok: true as const,
      resolved,
      fields: {
        title: sanitizePlainText(data.title, 180),
        description: data.description ? sanitizePlainText(data.description, 8000) : null,
        categoryId: data.categoryId || null,
        eventId: data.eventId || null,
        ministryId: data.ministryId || null,
        albumDate: parseDate(data.albumDate),
        coverImageUrl: coverImageUrl ?? null,
        coverImageAlt: coverImageAlt ?? null,
        isFeatured: Boolean(data.isFeatured),
        seoTitle: data.seoTitle ? sanitizePlainText(data.seoTitle, 70) : null,
        seoDescription: data.seoDescription ? sanitizePlainText(data.seoDescription, 160) : null,
        publishAt: parseDate(data.publishAt),
      },
    };
  } catch {
    return { ok: false as const, errors: { coverImageUrl: ['Images must use a safe uploaded file path.'] } };
  }
}

export function prepareMediaFields(
  data: {
    title: string;
    description?: string | null;
    mediaType: 'photo' | 'video';
    fileUrl?: string | null;
    thumbnailUrl?: string | null;
    externalUrl?: string | null;
    caption?: string | null;
    altText?: string | null;
    photographer?: string | null;
    takenAt?: string | null;
    status?: GalleryStatusValue | null;
    isFeatured?: boolean;
    sortOrder?: number;
    sermonId?: string | null;
    eventId?: string | null;
    ministryId?: string | null;
  },
  user: AuthUser
) {
  try {
    const fileUrl = data.fileUrl === undefined ? undefined : sanitizeOptionalUrl(data.fileUrl);
    const thumbnailUrl = data.thumbnailUrl === undefined ? undefined : sanitizeOptionalUrl(data.thumbnailUrl);
    const altText = data.altText ? sanitizePlainText(data.altText, 180) : null;
    const resolved = resolveGalleryWrite(user, { status: data.status });
    if (resolved.status === 'published' && data.mediaType === 'photo' && isMeaninglessAlt(altText)) {
      return { ok: false as const, errors: { altText: ['Published photos require meaningful alt text.'] } };
    }
    let externalUrl: string | null = null;
    if (data.mediaType === 'video' && data.externalUrl) {
      const video = parseApprovedVideo(data.externalUrl);
      if (!video && !data.sermonId) {
        return { ok: false as const, errors: { externalUrl: ['Only YouTube or Vimeo URLs are allowed.'] } };
      }
      externalUrl = video?.watchUrl || null;
    }
    if (data.mediaType === 'photo' && data.externalUrl) {
      return { ok: false as const, errors: { externalUrl: ['Photos cannot use an external video URL.'] } };
    }
    return {
      ok: true as const,
      resolved,
      fields: {
        title: sanitizePlainText(data.title, 180),
        description: data.description ? sanitizePlainText(data.description, 4000) : null,
        mediaType: data.mediaType,
        fileUrl: data.mediaType === 'photo' ? fileUrl ?? null : null,
        thumbnailUrl: thumbnailUrl ?? null,
        externalUrl,
        caption: data.caption ? sanitizePlainText(data.caption, 400) : null,
        altText,
        photographer: data.photographer ? sanitizePlainText(data.photographer, 120) : null,
        takenAt: parseDate(data.takenAt),
        isFeatured: Boolean(data.isFeatured),
        sortOrder: data.sortOrder ?? 0,
        sermonId: data.sermonId || null,
        eventId: data.eventId || null,
        ministryId: data.ministryId || null,
      },
    };
  } catch {
    return { ok: false as const, errors: { fileUrl: ['Files must use a safe uploaded path.'] } };
  }
}
