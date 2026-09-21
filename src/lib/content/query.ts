import { db } from '@/lib/db';

export async function promoteScheduledContent(now = new Date()) {
  const where = { status: 'scheduled' as const, publishAt: { lte: now } };
  await db.$transaction([
    db.cmsPage.updateMany({
      where,
      data: { status: 'published', publishedAt: now },
    }),
    db.newsArticle.updateMany({
      where,
      data: { status: 'published', publishedAt: now },
    }),
    db.announcement.updateMany({
      where,
      data: { status: 'published', publishedAt: now },
    }),
    db.resource.updateMany({
      where,
      data: { status: 'published', publishedAt: now },
    }),
    db.sermon.updateMany({
      where,
      data: { status: 'published', publishedAt: now },
    }),
    db.sermonSeries.updateMany({
      where,
      data: { status: 'published', publishedAt: now },
    }),
    db.event.updateMany({
      where,
      data: { status: 'published', publishedAt: now },
    }),
  ]);
}

export async function enforceFeaturedLimit(
  model: 'cmsPage' | 'newsArticle' | 'announcement' | 'resource' | 'sermon' | 'event' | 'galleryAlbum',
  keepId: string
) {
  const client = db[model] as {
    findMany: (args: unknown) => Promise<Array<{ id: string }>>;
    updateMany: (args: unknown) => Promise<unknown>;
  };
  const featured = await client.findMany({
    where: { isFeatured: true, id: { not: keepId } },
    orderBy: { updatedAt: 'desc' },
    select: { id: true },
  });
  if (featured.length < 3) return;
  const extra = featured.slice(2).map((row) => row.id);
  if (extra.length) {
    await client.updateMany({
      where: { id: { in: extra } },
      data: { isFeatured: false },
    });
  }
}

const authorSelect = {
  id: true,
  firstName: true,
  lastName: true,
} as const;

export function serializeAuthor(author: {
  id: string;
  firstName: string;
  lastName: string;
} | null) {
  if (!author) return null;
  return {
    id: author.id,
    name: `${author.firstName} ${author.lastName}`.trim(),
  };
}

export { authorSelect };

export function seoDefaults(input: {
  title: string;
  excerpt?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  featuredImageUrl?: string | null;
  ogImageUrl?: string | null;
}) {
  return {
    seoTitle: input.seoTitle || input.title.slice(0, 70),
    seoDescription:
      input.seoDescription ||
      (input.excerpt || '').replace(/\s+/g, ' ').trim().slice(0, 160) ||
      input.title,
    ogImage: input.ogImageUrl || input.featuredImageUrl || null,
  };
}
