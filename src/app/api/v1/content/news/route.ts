import { db } from '@/lib/db';
import { paginated, validationError } from '@/lib/api/response';
import { authorSelect, promoteScheduledContent, serializeAuthor, seoDefaults } from '@/lib/content/query';
import { publicStatusWhere } from '@/lib/content/status';
import { contentListSchema, formatZodErrors } from '@/lib/content/validation';

export async function GET(request: Request) {
  await promoteScheduledContent();
  const url = new URL(request.url);
  const parsed = contentListSchema.safeParse({
    q: url.searchParams.get('q') || undefined,
    page: url.searchParams.get('page') || 1,
    pageSize: url.searchParams.get('pageSize') || 12,
    category: url.searchParams.get('category') || undefined,
    tag: url.searchParams.get('tag') || undefined,
    featured: url.searchParams.get('featured') || undefined,
  });
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const now = new Date();
  const { q, page, pageSize, category, tag, featured } = parsed.data;
  const where: Record<string, unknown> = { AND: [publicStatusWhere(now)] };
  const and = where.AND as Record<string, unknown>[];
  if (q) {
    and.push({
      OR: [{ title: { contains: q } }, { excerpt: { contains: q } }, { content: { contains: q } }],
    });
  }
  if (category) and.push({ category: { slug: category } });
  if (tag) and.push({ tags: { some: { tag: { slug: tag } } } });
  if (featured === 'true') and.push({ isFeatured: true });

  const [totalItems, rows] = await Promise.all([
    db.newsArticle.count({ where }),
    db.newsArticle.findMany({
      where,
      include: {
        author: { select: authorSelect },
        category: { select: { name: true, slug: true } },
        tags: { include: { tag: { select: { name: true, slug: true } } } },
      },
      orderBy: [{ isFeatured: 'desc' }, { publishedAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return paginated(
    rows.map((row) => {
      const seo = seoDefaults(row);
      return {
        id: row.id,
        title: row.title,
        slug: row.slug,
        excerpt: row.excerpt,
        featuredImageUrl: row.featuredImageUrl,
        featuredImageAlt: row.featuredImageAlt,
        isFeatured: row.isFeatured,
        publishedAt: row.publishedAt?.toISOString() ?? null,
        category: row.category,
        tags: row.tags.map((item) => item.tag),
        author: serializeAuthor(row.author),
        seoTitle: seo.seoTitle,
        seoDescription: seo.seoDescription,
        ogImage: seo.ogImage,
      };
    }),
    { page, pageSize, totalItems }
  );
}
