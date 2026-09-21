import { db } from '@/lib/db';
import { notFound, paginated, success, validationError } from '@/lib/api/response';
import { readJson } from '@/lib/auth/http';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import {
  enforceFeaturedLimit,
  logContentChange,
  parseDate,
  reservedPageError,
  resolveWriteStatus,
  revalidatePublicContent,
  sanitizeMarkdown,
  sanitizeOptionalUrl,
  sanitizePlainText,
  uniqueContentSlug,
  unsafeUrlError,
} from '@/lib/content/admin-write';
import { contentListSchema, formatZodErrors, pageWriteSchema } from '@/lib/content/validation';
import { pageInclude, serializeAdminPage } from '@/lib/content/serialize';

function listWhere(q?: string, status?: string, featured?: string) {
  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [{ title: { contains: q } }, { excerpt: { contains: q } }, { slug: { contains: q } }];
  }
  if (status) where.status = status;
  if (featured === 'true') where.isFeatured = true;
  if (featured === 'false') where.isFeatured = false;
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
    sort: url.searchParams.get('sort') || undefined,
    dir: url.searchParams.get('dir') || undefined,
  });
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const { q, page, pageSize, status, featured, sort, dir } = parsed.data;
  const where = listWhere(q, status, featured);
  const orderField = ['title', 'status', 'updatedAt', 'publishedAt', 'sortOrder'].includes(sort || '')
    ? sort!
    : 'updatedAt';

  const [totalItems, rows] = await Promise.all([
    db.cmsPage.count({ where }),
    db.cmsPage.findMany({
      where,
      include: pageInclude,
      orderBy: { [orderField]: dir === 'asc' ? 'asc' : 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return paginated(rows.map(serializeAdminPage), { page, pageSize, totalItems });
}

export async function POST(request: Request) {
  const auth = await guardAdminWrite(request, 'content', 'create');
  if (!auth.ok) return auth.error;

  const parsed = pageWriteSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const data = parsed.data;
  const slug = await uniqueContentSlug('cmsPage', data.title, data.slug);
  const reserved = reservedPageError(slug);
  if (reserved) return reserved;

  let featuredImageUrl: string | null;
  try {
    featuredImageUrl = sanitizeOptionalUrl(data.featuredImageUrl);
    sanitizeOptionalUrl(data.ogImageUrl);
  } catch {
    return unsafeUrlError();
  }

  const publishAt = parseDate(data.publishAt);
  const resolved = resolveWriteStatus(auth.user, { status: data.status, publishAt });

  const page = await db.cmsPage.create({
    data: {
      title: sanitizePlainText(data.title, 180),
      slug,
      excerpt: data.excerpt ? sanitizePlainText(data.excerpt, 400) : null,
      content: sanitizeMarkdown(data.content),
      featuredImageUrl,
      featuredImageAlt: data.featuredImageAlt ? sanitizePlainText(data.featuredImageAlt, 180) : null,
      status: resolved.status,
      isFeatured: data.isFeatured ?? false,
      sortOrder: data.sortOrder ?? 0,
      seoTitle: data.seoTitle ? sanitizePlainText(data.seoTitle, 70) : null,
      seoDescription: data.seoDescription ? sanitizePlainText(data.seoDescription, 160) : null,
      ogImageUrl: data.ogImageUrl ? sanitizeOptionalUrl(data.ogImageUrl) : null,
      authorId: auth.user.id,
      publishAt,
      publishedAt: resolved.publishedAt,
    },
    include: pageInclude,
  });

  if (page.isFeatured) await enforceFeaturedLimit('cmsPage', page.id);
  await logContentChange({
    type: resolved.status === 'published' ? 'content.published' : 'content.created',
    entity: 'cms_page',
    entityId: page.id,
    userId: auth.user.id,
    request,
    details: { slug: page.slug, status: page.status },
  });
  revalidatePublicContent([`/pages/${page.slug}`]);
  return success(serializeAdminPage(page), 'Page created as a draft unless you published it.', 201);
}
