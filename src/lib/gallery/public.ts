import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { promoteScheduledContent } from '@/lib/content/query';
import { albumInclude, mediaInclude, serializeAlbum, serializeMedia } from './serialize';
import { publicGalleryWhere, publicMediaWhere } from './status';

export async function getPublicAlbumList(input: {
  q?: string;
  category?: string;
  ministry?: string;
  event?: string;
  type?: 'photo' | 'video';
  featured?: boolean;
  from?: string;
  to?: string;
  sort?: 'newest' | 'oldest' | 'featured';
  page: number;
  pageSize: number;
}) {
  await promoteScheduledContent();
  const now = new Date();
  const and: Prisma.GalleryAlbumWhereInput[] = [publicGalleryWhere(now)];
  if (input.q) {
    and.push({
      OR: [
        { title: { contains: input.q } },
        { description: { contains: input.q } },
        { category: { name: { contains: input.q } } },
        { event: { title: { contains: input.q } } },
        { ministry: { name: { contains: input.q } } },
        { items: { some: { status: 'published', title: { contains: input.q } } } },
      ],
    });
  }
  if (input.category) {
    and.push({ OR: [{ categoryId: input.category }, { category: { slug: input.category } }] });
  }
  if (input.ministry) {
    and.push({ OR: [{ ministryId: input.ministry }, { ministry: { slug: input.ministry } }] });
  }
  if (input.event) {
    and.push({ OR: [{ eventId: input.event }, { event: { slug: input.event } }] });
  }
  if (input.featured) and.push({ isFeatured: true });
  if (input.from) {
    const from = new Date(input.from);
    if (!Number.isNaN(from.getTime())) and.push({ albumDate: { gte: from } });
  }
  if (input.to) {
    const to = new Date(input.to);
    if (!Number.isNaN(to.getTime())) and.push({ albumDate: { lte: to } });
  }
  if (input.type) {
    and.push({ items: { some: { status: 'published', mediaType: input.type } } });
  }
  const where = { AND: and };
  const orderBy: Prisma.GalleryAlbumOrderByWithRelationInput[] =
    input.sort === 'oldest'
      ? [{ albumDate: 'asc' }, { publishedAt: 'asc' }]
      : input.sort === 'featured'
        ? [{ isFeatured: 'desc' }, { publishedAt: 'desc' }]
        : [{ publishedAt: 'desc' }, { albumDate: 'desc' }];

  const [totalItems, rows, categories] = await Promise.all([
    db.galleryAlbum.count({ where }),
    db.galleryAlbum.findMany({
      where,
      include: {
        ...albumInclude,
        items: {
          where: publicMediaWhere(),
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          take: 1,
        },
      },
      orderBy,
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
    }),
    db.galleryCategory.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        _count: {
          select: { albums: { where: publicGalleryWhere(now) } },
        },
      },
    }),
  ]);

  return {
    albums: rows.map((row) => serializeAlbum(row, { public: true })).filter(Boolean),
    categories: categories.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      albumCount: row._count.albums,
    })),
    page: input.page,
    pageSize: input.pageSize,
    totalItems,
  };
}

export async function getPublicAlbumBySlug(slug: string) {
  await promoteScheduledContent();
  const now = new Date();
  const row = await db.galleryAlbum.findFirst({
    where: { slug, AND: [publicGalleryWhere(now)] },
    include: {
      ...albumInclude,
      items: {
        where: publicMediaWhere(),
        include: mediaInclude,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      },
    },
  });
  if (!row) return null;
  return serializeAlbum(row, { public: true, includeItems: true });
}

export async function getPublicMediaList(input: {
  q?: string;
  album?: string;
  type?: 'photo' | 'video';
  ministry?: string;
  event?: string;
  featured?: boolean;
  sort?: 'newest' | 'oldest' | 'featured';
  page: number;
  pageSize: number;
}) {
  await promoteScheduledContent();
  const now = new Date();
  const and: Prisma.GalleryMediaItemWhereInput[] = [
    publicMediaWhere(),
    { album: publicGalleryWhere(now) },
  ];
  if (input.q) {
    and.push({
      OR: [
        { title: { contains: input.q } },
        { caption: { contains: input.q } },
        { description: { contains: input.q } },
        { album: { title: { contains: input.q } } },
      ],
    });
  }
  if (input.album) {
    and.push({ OR: [{ albumId: input.album }, { album: { slug: input.album } }] });
  }
  if (input.type) and.push({ mediaType: input.type });
  if (input.ministry) {
    and.push({ OR: [{ ministryId: input.ministry }, { ministry: { slug: input.ministry } }] });
  }
  if (input.event) {
    and.push({ OR: [{ eventId: input.event }, { event: { slug: input.event } }] });
  }
  if (input.featured) and.push({ isFeatured: true });
  const where = { AND: and };
  const orderBy: Prisma.GalleryMediaItemOrderByWithRelationInput[] =
    input.sort === 'oldest'
      ? [{ takenAt: 'asc' }, { createdAt: 'asc' }]
      : input.sort === 'featured'
        ? [{ isFeatured: 'desc' }, { createdAt: 'desc' }]
        : [{ createdAt: 'desc' }];
  const [totalItems, rows] = await Promise.all([
    db.galleryMediaItem.count({ where }),
    db.galleryMediaItem.findMany({
      where,
      include: mediaInclude,
      orderBy,
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
    }),
  ]);
  return {
    media: rows.map((row) => serializeMedia(row, { public: true })).filter(Boolean),
    page: input.page,
    pageSize: input.pageSize,
    totalItems,
  };
}

export async function getHomeGallery() {
  await promoteScheduledContent();
  const now = new Date();
  const [featured, latestPhotos] = await Promise.all([
    db.galleryAlbum.findMany({
      where: { AND: [publicGalleryWhere(now), { isFeatured: true }] },
      include: {
        ...albumInclude,
        items: {
          where: publicMediaWhere(),
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          take: 1,
        },
      },
      orderBy: { publishedAt: 'desc' },
      take: 1,
    }),
    db.galleryMediaItem.findMany({
      where: {
        AND: [publicMediaWhere(), { mediaType: 'photo' }, { album: publicGalleryWhere(now) }],
      },
      include: mediaInclude,
      orderBy: { createdAt: 'desc' },
      take: 4,
    }),
  ]);
  return {
    featuredAlbum: featured[0] ? serializeAlbum(featured[0], { public: true }) : null,
    latestPhotos: latestPhotos.map((row) => serializeMedia(row, { public: true })).filter(Boolean),
  };
}

export async function getPublishedAlbumsForEvent(eventId: string) {
  await promoteScheduledContent();
  const now = new Date();
  const rows = await db.galleryAlbum.findMany({
    where: { eventId, AND: [publicGalleryWhere(now)] },
    include: {
      ...albumInclude,
      items: {
        where: publicMediaWhere(),
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        take: 4,
      },
    },
    orderBy: { publishedAt: 'desc' },
    take: 6,
  });
  return rows.map((row) => serializeAlbum(row, { public: true, includeItems: true })).filter(Boolean);
}

export async function getPublishedAlbumsForMinistry(ministrySlug: string) {
  await promoteScheduledContent();
  const now = new Date();
  const rows = await db.galleryAlbum.findMany({
    where: { ministry: { slug: ministrySlug }, AND: [publicGalleryWhere(now)] },
    include: {
      ...albumInclude,
      items: {
        where: publicMediaWhere(),
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        take: 4,
      },
    },
    orderBy: { publishedAt: 'desc' },
    take: 6,
  });
  return rows.map((row) => serializeAlbum(row, { public: true, includeItems: true })).filter(Boolean);
}

export async function getPublishedGalleryUrls() {
  await promoteScheduledContent();
  const now = new Date();
  return db.galleryAlbum.findMany({
    where: publicGalleryWhere(now),
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: 'desc' },
  });
}

export async function getPublicCategories() {
  const now = new Date();
  const rows = await db.galleryCategory.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { albums: { where: publicGalleryWhere(now) } } } },
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    albumCount: row._count.albums,
  }));
}
