import { db } from '@/lib/db';
import { paginated, success, validationError } from '@/lib/api/response';
import { readJson } from '@/lib/auth/http';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import {
  enforceFeaturedLimit,
  logContentChange,
  parseDate,
  resolveWriteStatus,
  revalidatePublicContent,
  sanitizeMarkdown,
  sanitizeOptionalUrl,
  sanitizePlainText,
  uniqueContentSlug,
  unsafeUrlError,
} from '@/lib/content/admin-write';
import { contentListSchema, formatZodErrors, newsWriteSchema } from '@/lib/content/validation';
import { newsInclude, serializeAdminNews } from '@/lib/content/serialize';

function listWhere(q?: string, status?: string, featured?: string, category?: string, tag?: string) {
  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [{ title: { contains: q } }, { excerpt: { contains: q } }, { slug: { contains: q } }];
  }
  if (status) where.status = status;
  if (featured === 'true') where.isFeatured = true;
  if (featured === 'false') where.isFeatured = false;
  if (category) where.categoryId = category;
  if (tag) where.tags = { some: { tagId: tag } };
  return where;
}

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'content', 'view');
  if (!auth.ok) return auth.error;
  const url = new URL(request.url);
  const parsed = contentListSchema.safeParse({
    q: url.searchParams.get('q') || undefined,
    page: url.searchParams.get('page') || 1,
    pageSize: url.searchParams.get('pageSize') || 20,
    status: url.searchParams.get('status') || undefined,
    featured: url.searchParams.get('featured') || undefined,
    category: url.searchParams.get('category') || undefined,
    tag: url.searchParams.get('tag') || undefined,
    sort: url.searchParams.get('sort') || undefined,
    dir: url.searchParams.get('dir') || undefined,
  });
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));
  const { q, page, pageSize, status, featured, category, tag, sort, dir } = parsed.data;
  const where = listWhere(q, status, featured, category, tag);
  const orderField = ['title', 'status', 'updatedAt', 'publishedAt'].includes(sort || '')
    ? sort!
    : 'updatedAt';

  const [totalItems, rows] = await Promise.all([
    db.newsArticle.count({ where }),
    db.newsArticle.findMany({
      where,
      include: newsInclude,
      orderBy: { [orderField]: dir === 'asc' ? 'asc' : 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  return paginated(rows.map(serializeAdminNews), { page, pageSize, totalItems });
}

export async function POST(request: Request) {
  const auth = await guardAdminWrite(request, 'content', 'create');
  if (!auth.ok) return auth.error;
  const parsed = newsWriteSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));
  const data = parsed.data;
  const slug = await uniqueContentSlug('newsArticle', data.title, data.slug);
  try {
    sanitizeOptionalUrl(data.featuredImageUrl);
    sanitizeOptionalUrl(data.ogImageUrl);
  } catch {
    return unsafeUrlError();
  }
  const publishAt = parseDate(data.publishAt);
  const resolved = resolveWriteStatus(auth.user, { status: data.status, publishAt });
  const article = await db.newsArticle.create({
    data: {
      title: sanitizePlainText(data.title, 180),
      slug,
      excerpt: data.excerpt ? sanitizePlainText(data.excerpt, 400) : null,
      content: sanitizeMarkdown(data.content),
      featuredImageUrl: sanitizeOptionalUrl(data.featuredImageUrl),
      featuredImageAlt: data.featuredImageAlt ? sanitizePlainText(data.featuredImageAlt, 180) : null,
      status: resolved.status,
      isFeatured: data.isFeatured ?? false,
      seoTitle: data.seoTitle ? sanitizePlainText(data.seoTitle, 70) : null,
      seoDescription: data.seoDescription ? sanitizePlainText(data.seoDescription, 160) : null,
      ogImageUrl: sanitizeOptionalUrl(data.ogImageUrl),
      categoryId: data.categoryId ?? null,
      authorId: auth.user.id,
      publishAt,
      publishedAt: resolved.publishedAt,
      tags: data.tagIds?.length
        ? { create: data.tagIds.map((tagId) => ({ tagId })) }
        : undefined,
    },
    include: newsInclude,
  });
  if (article.isFeatured) await enforceFeaturedLimit('newsArticle', article.id);
  await logContentChange({
    type: resolved.status === 'published' ? 'content.published' : 'content.created',
    entity: 'news_article',
    entityId: article.id,
    userId: auth.user.id,
    request,
    details: { slug: article.slug, status: article.status },
  });
  revalidatePublicContent([`/news/${article.slug}`]);
  return success(serializeAdminNews(article), 'News article created.', 201);
}
