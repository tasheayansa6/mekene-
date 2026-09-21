import { db } from '@/lib/db';
import { authorSelect, promoteScheduledContent, serializeAuthor, seoDefaults } from './query';
import { isPubliclyVisible, publicStatusWhere } from './status';
import { listHomepageSections } from '@/lib/cms/homepage';

export async function getHomeCmsContent() {
  await promoteScheduledContent();
  const now = new Date();
  const visibility = publicStatusWhere(now);

  const [featuredNews, latestNews, announcements, featuredResources, homepageSections] =
    await Promise.all([
    db.newsArticle.findMany({
      where: { AND: [visibility, { isFeatured: true }] },
      take: 3,
      orderBy: { publishedAt: 'desc' },
      select: {
        title: true,
        slug: true,
        excerpt: true,
        featuredImageUrl: true,
        publishedAt: true,
      },
    }),
    db.newsArticle.findMany({
      where: visibility,
      take: 3,
      orderBy: { publishedAt: 'desc' },
      select: {
        title: true,
        slug: true,
        excerpt: true,
        featuredImageUrl: true,
        publishedAt: true,
        author: { select: authorSelect },
      },
    }),
    db.announcement.findMany({
      where: {
        AND: [
          visibility,
          { isFeatured: true },
          { startAt: { lte: now } },
          { OR: [{ endAt: null }, { endAt: { gt: now } }] },
        ],
      },
      take: 3,
      orderBy: [{ priority: 'desc' }, { startAt: 'desc' }],
      select: { title: true, slug: true, excerpt: true, priority: true, startAt: true },
    }),
    db.resource.findMany({
      where: { AND: [visibility, { isFeatured: true }] },
      take: 3,
      orderBy: { publishedAt: 'desc' },
      select: { title: true, slug: true, description: true, thumbnailUrl: true },
    }),
    listHomepageSections({ enabledOnly: true }),
  ]);

  return {
    featuredNews,
    latestNews: latestNews.map((item) => ({
      ...item,
      author: serializeAuthor(item.author),
      publishedAt: item.publishedAt?.toISOString() ?? null,
    })),
    announcements,
    featuredResources,
    homepageSections,
  };
}

export async function getPublicNewsList(options: {
  q?: string;
  category?: string;
  tag?: string;
  page?: number;
  pageSize?: number;
}) {
  await promoteScheduledContent();
  const now = new Date();
  const page = options.page || 1;
  const pageSize = options.pageSize || 12;
  const where: Record<string, unknown> = { AND: [publicStatusWhere(now)] };
  const and = where.AND as object[];
  if (options.q) {
    and.push({
      OR: [{ title: { contains: options.q } }, { excerpt: { contains: options.q } }],
    });
  }
  if (options.category) and.push({ category: { slug: options.category } });
  if (options.tag) and.push({ tags: { some: { tag: { slug: options.tag } } } });

  const [totalItems, featured, rows, categories] = await Promise.all([
    db.newsArticle.count({ where }),
    db.newsArticle.findFirst({
      where: { AND: [publicStatusWhere(now), { isFeatured: true }] },
      orderBy: { publishedAt: 'desc' },
      include: {
        author: { select: authorSelect },
        category: { select: { name: true, slug: true } },
      },
    }),
    db.newsArticle.findMany({
      where,
      include: {
        author: { select: authorSelect },
        category: { select: { name: true, slug: true } },
      },
      orderBy: [{ isFeatured: 'desc' }, { publishedAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.contentCategory.findMany({
      where: { scope: 'news' },
      orderBy: { sortOrder: 'asc' },
      select: { name: true, slug: true },
    }),
  ]);

  return {
    totalItems,
    page,
    pageSize,
    categories,
    featured: featured && isPubliclyVisible(featured) ? featured : null,
    articles: rows,
  };
}

export async function getPublicNewsBySlug(slug: string) {
  await promoteScheduledContent();
  const article = await db.newsArticle.findUnique({
    where: { slug },
    include: {
      author: { select: authorSelect },
      category: { select: { name: true, slug: true } },
      tags: { include: { tag: { select: { name: true, slug: true } } } },
    },
  });
  if (!article || !isPubliclyVisible(article)) return null;
  const related = await db.newsArticle.findMany({
    where: {
      AND: [
        publicStatusWhere(),
        { id: { not: article.id } },
        article.categoryId ? { categoryId: article.categoryId } : {},
      ],
    },
    take: 3,
    orderBy: { publishedAt: 'desc' },
    select: { title: true, slug: true, excerpt: true, publishedAt: true, featuredImageUrl: true },
  });
  return { article, related, seo: seoDefaults(article), author: serializeAuthor(article.author) };
}

export async function getActiveAnnouncements(options?: { includeTargeted?: boolean }) {
  await promoteScheduledContent();
  const now = new Date();
  return db.announcement.findMany({
    where: {
      AND: [
        publicStatusWhere(now),
        { startAt: { lte: now } },
        { OR: [{ endAt: null }, { endAt: { gt: now } }] },
        ...(options?.includeTargeted ? [] : [{ audience: 'everyone' as const }]),
      ],
    },
    include: { author: { select: authorSelect } },
    orderBy: [{ isFeatured: 'desc' }, { priority: 'desc' }, { startAt: 'desc' }],
    take: 50,
  });
}

export async function getPublicResources(options: { q?: string; category?: string; page?: number }) {
  await promoteScheduledContent();
  const now = new Date();
  const page = options.page || 1;
  const pageSize = 12;
  const where: Record<string, unknown> = {
    AND: [publicStatusWhere(now), { accessLevel: 'public' }],
  };
  const and = where.AND as object[];
  if (options.q) and.push({ OR: [{ title: { contains: options.q } }, { description: { contains: options.q } }] });
  if (options.category) and.push({ category: { slug: options.category } });
  const [totalItems, rows, categories] = await Promise.all([
    db.resource.count({ where }),
    db.resource.findMany({
      where,
      include: {
        author: { select: authorSelect },
        category: { select: { name: true, slug: true } },
      },
      orderBy: [{ isFeatured: 'desc' }, { publishedAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.contentCategory.findMany({
      where: { scope: 'resource' },
      orderBy: { sortOrder: 'asc' },
      select: { name: true, slug: true },
    }),
  ]);
  return { totalItems, page, pageSize, rows, categories };
}

export async function getPublicPageBySlug(slug: string) {
  await promoteScheduledContent();
  const page = await db.cmsPage.findUnique({
    where: { slug },
    include: { author: { select: authorSelect } },
  });
  if (!page || page.visibility !== 'public' || !isPubliclyVisible(page)) return null;
  return { page, seo: seoDefaults(page), author: serializeAuthor(page.author) };
}

export async function getPublishedCmsUrls() {
  await promoteScheduledContent();
  const visibility = publicStatusWhere();
  const now = new Date();
  const [pages, news, resources] = await Promise.all([
    db.cmsPage.findMany({
      where: {
        AND: [
          visibility,
          { visibility: 'public' },
          { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
        ],
      },
      select: { slug: true, updatedAt: true },
    }),
    db.newsArticle.findMany({ where: visibility, select: { slug: true, updatedAt: true } }),
    db.resource.findMany({ where: visibility, select: { slug: true, updatedAt: true } }),
  ]);
  return { pages, news, resources };
}
