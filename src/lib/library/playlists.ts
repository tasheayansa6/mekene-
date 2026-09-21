import { db } from '@/lib/db';
import { slugify } from '@/lib/admin/slug';
import { promoteScheduledContent } from '@/lib/content/query';
import { isPubliclyVisible } from '@/lib/content/status';
import { sermonInclude, serializeSermon } from '@/lib/sermons/serialize';

const playlistItemInclude = {
  sermon: { include: sermonInclude },
  series: { select: { id: true, name: true, slug: true, imageUrl: true } },
} as const;

function serializePlaylistItem(item: {
  id: string;
  sortOrder: number;
  sermon: Parameters<typeof serializeSermon>[0] | null;
  series: { id: string; name: string; slug: string; imageUrl: string | null } | null;
}) {
  return {
    id: item.id,
    sortOrder: item.sortOrder,
    sermon: item.sermon ? serializeSermon(item.sermon, { forPublic: true }) : null,
    series: item.series,
    href: item.sermon
      ? `/sermons/${item.sermon.slug}`
      : item.series
        ? `/sermons/series/${item.series.slug}`
        : null,
  };
}

function serializePublicPlaylist(row: {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  coverImageUrl: string | null;
  isFeatured: boolean;
  publishedAt: Date | null;
  _count?: { items: number };
}) {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    coverImageUrl: row.coverImageUrl,
    isFeatured: row.isFeatured,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    itemCount: row._count?.items ?? 0,
    href: `/library/playlists/${row.slug}`,
  };
}

export function isPublicPlaylist(row: { status: string; isPublic: boolean }) {
  return row.status === 'published' && row.isPublic === true;
}

export async function listPublicPlaylists(options?: { featured?: boolean; page?: number; pageSize?: number }) {
  await promoteScheduledContent();
  const page = options?.page || 1;
  const pageSize = Math.min(24, options?.pageSize || 12);
  const where = {
    status: 'published' as const,
    isPublic: true,
    ...(options?.featured ? { isFeatured: true } : {}),
  };

  const [totalItems, rows] = await Promise.all([
    db.mediaPlaylist.count({ where }),
    db.mediaPlaylist.findMany({
      where,
      orderBy: [{ isFeatured: 'desc' }, { publishedAt: 'desc' }, { updatedAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { _count: { select: { items: true } } },
    }),
  ]);

  return {
    page,
    pageSize,
    totalItems,
    playlists: rows.map(serializePublicPlaylist),
  };
}

export async function getPublicPlaylistBySlug(slug: string) {
  await promoteScheduledContent();
  const playlist = await db.mediaPlaylist.findUnique({
    where: { slug },
    include: {
      items: {
        orderBy: { sortOrder: 'asc' },
        include: playlistItemInclude,
      },
      _count: { select: { items: true } },
    },
  });
  if (!playlist || !isPublicPlaylist(playlist)) return null;

  const items = playlist.items
    .map((item) => {
      if (item.sermon && !isPubliclyVisible(item.sermon)) return null;
      if (item.sermon && item.sermon.accessLevel !== 'public') return null;
      return serializePlaylistItem(item);
    })
    .filter(Boolean);

  return {
    playlist: serializePublicPlaylist(playlist),
    items,
  };
}

async function uniquePlaylistSlug(title: string, requested?: string | null, excludeId?: string) {
  const base = slugify(requested?.trim() || title);
  let candidate = base;
  let suffix = 2;
  while (true) {
    const existing = await db.mediaPlaylist.findFirst({
      where: excludeId ? { slug: candidate, id: { not: excludeId } } : { slug: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}

export async function listAdminPlaylists(options: {
  q?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = options.page || 1;
  const pageSize = Math.min(50, options.pageSize || 20);
  const and: object[] = [];
  if (options.q) {
    and.push({
      OR: [{ title: { contains: options.q } }, { description: { contains: options.q } }, { slug: { contains: options.q } }],
    });
  }
  if (options.status) and.push({ status: options.status });
  const where = and.length ? { AND: and } : {};

  const [totalItems, rows] = await Promise.all([
    db.mediaPlaylist.count({ where }),
    db.mediaPlaylist.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { _count: { select: { items: true } } },
    }),
  ]);

  return {
    page,
    pageSize,
    totalItems,
    playlists: rows.map((row) => ({
      ...serializePublicPlaylist(row),
      status: row.status,
      isPublic: row.isPublic,
      ownerId: row.ownerId,
      updatedAt: row.updatedAt.toISOString(),
    })),
  };
}

export async function getAdminPlaylistById(id: string) {
  const playlist = await db.mediaPlaylist.findUnique({
    where: { id },
    include: {
      items: { orderBy: { sortOrder: 'asc' }, include: playlistItemInclude },
      _count: { select: { items: true } },
    },
  });
  if (!playlist) return null;
  return {
    ...serializePublicPlaylist(playlist),
    status: playlist.status,
    isPublic: playlist.isPublic,
    ownerId: playlist.ownerId,
    updatedAt: playlist.updatedAt.toISOString(),
    items: playlist.items.map((item) => ({
      id: item.id,
      sortOrder: item.sortOrder,
      sermonId: item.sermonId,
      seriesId: item.seriesId,
      sermon: item.sermon ? { id: item.sermon.id, title: item.sermon.title, slug: item.sermon.slug } : null,
      series: item.series,
    })),
  };
}

export async function createPlaylist(input: {
  title: string;
  slug?: string | null;
  description?: string | null;
  coverImageUrl?: string | null;
  isPublic?: boolean;
  isFeatured?: boolean;
  ownerId?: string | null;
}) {
  const slug = await uniquePlaylistSlug(input.title, input.slug);
  return db.mediaPlaylist.create({
    data: {
      title: input.title.trim(),
      slug,
      description: input.description?.trim() || null,
      coverImageUrl: input.coverImageUrl || null,
      isPublic: input.isPublic ?? false,
      isFeatured: input.isFeatured ?? false,
      ownerId: input.ownerId || null,
      status: 'draft',
    },
  });
}

export async function updatePlaylist(
  id: string,
  input: {
    title?: string;
    slug?: string | null;
    description?: string | null;
    coverImageUrl?: string | null;
    isPublic?: boolean;
    isFeatured?: boolean;
    status?: string;
  }
) {
  const existing = await db.mediaPlaylist.findUnique({ where: { id } });
  if (!existing) return null;

  const slug =
    input.slug !== undefined || input.title
      ? await uniquePlaylistSlug(input.title || existing.title, input.slug ?? existing.slug, id)
      : existing.slug;

  return db.mediaPlaylist.update({
    where: { id },
    data: {
      ...(input.title !== undefined ? { title: input.title.trim() } : {}),
      slug,
      ...(input.description !== undefined ? { description: input.description?.trim() || null } : {}),
      ...(input.coverImageUrl !== undefined ? { coverImageUrl: input.coverImageUrl || null } : {}),
      ...(input.isPublic !== undefined ? { isPublic: input.isPublic } : {}),
      ...(input.isFeatured !== undefined ? { isFeatured: input.isFeatured } : {}),
      ...(input.status !== undefined ? { status: input.status as 'draft' | 'published' | 'archived' } : {}),
    },
  });
}

export async function publishPlaylist(id: string) {
  return db.mediaPlaylist.update({
    where: { id },
    data: {
      status: 'published',
      publishedAt: new Date(),
      isPublic: true,
    },
  });
}

export async function setPlaylistItems(
  playlistId: string,
  items: Array<{ sermonId?: string | null; seriesId?: string | null; sortOrder: number }>
) {
  await db.$transaction([
    db.mediaPlaylistItem.deleteMany({ where: { playlistId } }),
    ...items.map((item, index) =>
      db.mediaPlaylistItem.create({
        data: {
          playlistId,
          sermonId: item.sermonId || null,
          seriesId: item.seriesId || null,
          sortOrder: item.sortOrder ?? index,
        },
      })
    ),
  ]);
  return getAdminPlaylistById(playlistId);
}
