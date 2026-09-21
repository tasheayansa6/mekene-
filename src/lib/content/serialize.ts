import { authorSelect, serializeAuthor, seoDefaults } from './query';

export const pageInclude = { author: { select: authorSelect } } as const;

export const newsInclude = {
  author: { select: authorSelect },
  category: { select: { id: true, name: true, slug: true } },
  tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
} as const;

export const announcementInclude = { author: { select: authorSelect } } as const;

export const resourceInclude = {
  author: { select: authorSelect },
  category: { select: { id: true, name: true, slug: true } },
} as const;

function iso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

export function serializeAdminPage(page: {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  featuredImageUrl: string | null;
  featuredImageAlt: string | null;
  status: string;
  isFeatured: boolean;
  sortOrder: number;
  seoTitle: string | null;
  seoDescription: string | null;
  ogImageUrl: string | null;
  publishedAt: Date | null;
  publishAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  author: { id: string; firstName: string; lastName: string };
}) {
  const seo = seoDefaults(page);
  return {
    id: page.id,
    type: 'page' as const,
    title: page.title,
    slug: page.slug,
    excerpt: page.excerpt,
    content: page.content,
    featuredImageUrl: page.featuredImageUrl,
    featuredImageAlt: page.featuredImageAlt,
    status: page.status,
    isFeatured: page.isFeatured,
    sortOrder: page.sortOrder,
    seoTitle: page.seoTitle,
    seoDescription: page.seoDescription,
    ogImageUrl: page.ogImageUrl,
    publishedAt: iso(page.publishedAt),
    publishAt: iso(page.publishAt),
    createdAt: page.createdAt.toISOString(),
    updatedAt: page.updatedAt.toISOString(),
    author: serializeAuthor(page.author),
    seo,
  };
}

export function serializeAdminNews(article: {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  featuredImageUrl: string | null;
  featuredImageAlt: string | null;
  status: string;
  isFeatured: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  ogImageUrl: string | null;
  categoryId: string | null;
  publishedAt: Date | null;
  publishAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  author: { id: string; firstName: string; lastName: string };
  category: { id: string; name: string; slug: string } | null;
  tags: Array<{ tag: { id: string; name: string; slug: string } }>;
}) {
  const seo = seoDefaults(article);
  return {
    id: article.id,
    type: 'news' as const,
    title: article.title,
    slug: article.slug,
    excerpt: article.excerpt,
    content: article.content,
    featuredImageUrl: article.featuredImageUrl,
    featuredImageAlt: article.featuredImageAlt,
    status: article.status,
    isFeatured: article.isFeatured,
    seoTitle: article.seoTitle,
    seoDescription: article.seoDescription,
    ogImageUrl: article.ogImageUrl,
    categoryId: article.categoryId,
    category: article.category,
    tags: article.tags.map((item) => item.tag),
    tagIds: article.tags.map((item) => item.tag.id),
    publishedAt: iso(article.publishedAt),
    publishAt: iso(article.publishAt),
    createdAt: article.createdAt.toISOString(),
    updatedAt: article.updatedAt.toISOString(),
    author: serializeAuthor(article.author),
    seo,
  };
}

export function serializeAdminAnnouncement(row: {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  priority: string;
  status: string;
  startAt: Date;
  endAt: Date | null;
  isFeatured: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  featuredImageUrl: string | null;
  featuredImageAlt: string | null;
  publishedAt: Date | null;
  publishAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  author: { id: string; firstName: string; lastName: string };
}) {
  const seo = seoDefaults(row);
  return {
    id: row.id,
    type: 'announcement' as const,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    content: row.content,
    priority: row.priority,
    status: row.status,
    startAt: row.startAt.toISOString(),
    endAt: iso(row.endAt),
    isFeatured: row.isFeatured,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    featuredImageUrl: row.featuredImageUrl,
    featuredImageAlt: row.featuredImageAlt,
    publishedAt: iso(row.publishedAt),
    publishAt: iso(row.publishAt),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    author: serializeAuthor(row.author),
    seo,
  };
}

export function serializeAdminResource(row: {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  content: string | null;
  fileUrl: string | null;
  fileName: string | null;
  fileMime: string | null;
  fileSize: number | null;
  thumbnailUrl: string | null;
  thumbnailAlt: string | null;
  externalUrl: string | null;
  status: string;
  isFeatured: boolean;
  downloadCount: number;
  seoTitle: string | null;
  seoDescription: string | null;
  categoryId: string | null;
  publishedAt: Date | null;
  publishAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  author: { id: string; firstName: string; lastName: string };
  category: { id: string; name: string; slug: string } | null;
}) {
  const seo = seoDefaults({ ...row, excerpt: row.description });
  return {
    id: row.id,
    type: 'resource' as const,
    title: row.title,
    slug: row.slug,
    description: row.description,
    content: row.content,
    fileUrl: row.fileUrl,
    fileName: row.fileName,
    fileMime: row.fileMime,
    fileSize: row.fileSize,
    thumbnailUrl: row.thumbnailUrl,
    thumbnailAlt: row.thumbnailAlt,
    externalUrl: row.externalUrl,
    status: row.status,
    isFeatured: row.isFeatured,
    downloadCount: row.downloadCount,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    categoryId: row.categoryId,
    category: row.category,
    publishedAt: iso(row.publishedAt),
    publishAt: iso(row.publishAt),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    author: serializeAuthor(row.author),
    seo,
  };
}
