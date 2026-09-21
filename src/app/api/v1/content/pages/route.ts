import { db } from '@/lib/db';
import { paginated, success, validationError } from '@/lib/api/response';
import { promoteScheduledContent, authorSelect, serializeAuthor, seoDefaults } from '@/lib/content/query';
import { publicStatusWhere } from '@/lib/content/status';
import { contentListSchema, formatZodErrors } from '@/lib/content/validation';

function serializePage(page: {
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
  publishedAt: Date | null;
  publishAt: Date | null;
  updatedAt: Date;
  author: { id: string; firstName: string; lastName: string };
}) {
  const seo = seoDefaults(page);
  return {
    id: page.id,
    title: page.title,
    slug: page.slug,
    excerpt: page.excerpt,
    content: page.content,
    featuredImageUrl: page.featuredImageUrl,
    featuredImageAlt: page.featuredImageAlt,
    isFeatured: page.isFeatured,
    publishedAt: page.publishedAt?.toISOString() ?? null,
    updatedAt: page.updatedAt.toISOString(),
    author: serializeAuthor(page.author),
    seoTitle: seo.seoTitle,
    seoDescription: seo.seoDescription,
    ogImage: seo.ogImage,
  };
}

export async function GET(request: Request) {
  await promoteScheduledContent();
  const url = new URL(request.url);
  const parsed = contentListSchema.safeParse({
    q: url.searchParams.get('q') || undefined,
    page: url.searchParams.get('page') || 1,
    pageSize: url.searchParams.get('pageSize') || 12,
    featured: url.searchParams.get('featured') || undefined,
  });
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const now = new Date();
  const { q, page, pageSize, featured } = parsed.data;
  const where: Record<string, unknown> = { ...publicStatusWhere(now) };
  if (q) {
    where.AND = [
      publicStatusWhere(now),
      { OR: [{ title: { contains: q } }, { excerpt: { contains: q } }] },
    ];
    delete where.OR;
  }
  if (featured === 'true') where.isFeatured = true;

  const [totalItems, rows] = await Promise.all([
    db.cmsPage.count({ where }),
    db.cmsPage.findMany({
      where,
      include: { author: { select: authorSelect } },
      orderBy: [{ sortOrder: 'asc' }, { publishedAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return paginated(
    rows.map((row) => {
      const serialized = serializePage(row);
      const { content: _content, ...listItem } = serialized;
      return listItem;
    }),
    { page, pageSize, totalItems }
  );
}
