import { parseApprovedVideo } from '@/lib/sermons/video';
import { serializeAuthor } from '@/lib/content/query';
import { publicGalleryWhere } from './status';

const relatedSelect = {
  id: true,
  name: true,
  slug: true,
} as const;

export const albumInclude = {
  category: { select: { id: true, name: true, slug: true } },
  event: { select: { id: true, title: true, slug: true, status: true } },
  ministry: { select: relatedSelect },
  author: { select: { id: true, firstName: true, lastName: true } },
  _count: { select: { items: true } },
} as const;

export const mediaInclude = {
  album: { select: { id: true, title: true, slug: true, status: true } },
  event: { select: { id: true, title: true, slug: true } },
  ministry: { select: relatedSelect },
  sermon: { select: { id: true, title: true, slug: true, status: true, videoUrl: true } },
  author: { select: { id: true, firstName: true, lastName: true } },
} as const;

type AlbumRow = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  coverImageUrl: string | null;
  coverImageAlt: string | null;
  albumDate: Date | null;
  status: string;
  isFeatured: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  publishedAt: Date | null;
  publishAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  category: { id: string; name: string; slug: string } | null;
  event: { id: string; title: string; slug: string; status: string } | null;
  ministry: { id: string; name: string; slug: string } | null;
  author: { id: string; firstName: string; lastName: string } | null;
  _count?: { items: number };
  items?: MediaRow[];
};

type MediaRow = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  mediaType: string;
  fileUrl: string | null;
  thumbnailUrl: string | null;
  externalUrl: string | null;
  caption: string | null;
  altText: string | null;
  photographer: string | null;
  takenAt: Date | null;
  status: string;
  isFeatured: boolean;
  sortOrder: number;
  width: number | null;
  height: number | null;
  createdAt: Date;
  updatedAt: Date;
  album?: { id: string; title: string; slug: string; status: string } | null;
  event?: { id: string; title: string; slug: string } | null;
  ministry?: { id: string; name: string; slug: string } | null;
  sermon?: { id: string; title: string; slug: string; status: string; videoUrl: string | null } | null;
  author?: { id: string; firstName: string; lastName: string } | null;
};

export function serializeMedia(row: MediaRow, opts?: { public?: boolean }) {
  const isPublic = Boolean(opts?.public);
  if (isPublic && row.status !== 'published') return null;
  const video = parseApprovedVideo(row.externalUrl);
  const sermonPublic = row.sermon?.status === 'published' ? row.sermon : null;
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    mediaType: row.mediaType,
    fileUrl: row.mediaType === 'photo' ? row.fileUrl : null,
    thumbnailUrl: row.thumbnailUrl || (row.mediaType === 'photo' ? row.fileUrl : null),
    caption: row.caption,
    altText: row.altText || row.title,
    photographer: isPublic ? row.photographer : row.photographer,
    takenAt: row.takenAt,
    status: isPublic ? undefined : row.status,
    isFeatured: row.isFeatured,
    sortOrder: row.sortOrder,
    width: row.width,
    height: row.height,
    video: video
      ? { provider: video.provider, embedUrl: video.embedUrl, watchUrl: video.watchUrl }
      : null,
    sermon: sermonPublic
      ? { title: sermonPublic.title, slug: sermonPublic.slug, href: `/sermons/${sermonPublic.slug}` }
      : null,
    album: row.album ? { id: row.album.id, title: row.album.title, slug: row.album.slug } : null,
    event: row.event ? { id: row.event.id, title: row.event.title, slug: row.event.slug } : null,
    ministry: row.ministry,
    createdAt: isPublic ? undefined : row.createdAt,
    updatedAt: row.updatedAt,
    author: isPublic ? undefined : serializeAuthor(row.author || null),
  };
}

export function serializeAlbum(row: AlbumRow, opts?: { public?: boolean; includeItems?: boolean }) {
  const isPublic = Boolean(opts?.public);
  if (isPublic && !isGalleryPublic(row)) return null;
  const items = (row.items || [])
    .map((item) => serializeMedia(item, { public: isPublic }))
    .filter(Boolean);
  const photos = items.filter((item) => item && item.mediaType === 'photo');
  const videos = items.filter((item) => item && item.mediaType === 'video');
  const coverUrl = isPublic
    ? row.coverImageUrl || (photos[0] as { thumbnailUrl?: string | null; fileUrl?: string | null } | undefined)?.thumbnailUrl || null
    : row.coverImageUrl;
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    coverImageUrl: coverUrl,
    coverImageAlt: row.coverImageAlt || row.title,
    albumDate: row.albumDate,
    status: isPublic ? undefined : row.status,
    isFeatured: row.isFeatured,
    seoTitle: row.seoTitle || row.title,
    seoDescription: row.seoDescription || row.description,
    publishedAt: row.publishedAt,
    publishAt: isPublic ? undefined : row.publishAt,
    createdAt: isPublic ? undefined : row.createdAt,
    updatedAt: row.updatedAt,
    mediaCount: row._count?.items ?? items.length,
    publishedMediaCount: isPublic ? items.length : undefined,
    category: row.category,
    event:
      row.event && (isPublic ? row.event.status === 'published' : true)
        ? { id: row.event.id, title: row.event.title, slug: row.event.slug }
        : null,
    ministry: row.ministry,
    author: isPublic ? undefined : serializeAuthor(row.author),
    photos: opts?.includeItems ? photos : undefined,
    videos: opts?.includeItems ? videos : undefined,
    items: opts?.includeItems && !isPublic ? items : undefined,
  };
}

function isGalleryPublic(row: { status: string; publishAt: Date | null }, now = new Date()) {
  if (row.status !== 'published') return false;
  if (row.publishAt && row.publishAt > now) return false;
  return true;
}

export { publicGalleryWhere };
