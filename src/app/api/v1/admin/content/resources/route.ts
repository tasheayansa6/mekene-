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
import { contentListSchema, formatZodErrors, resourceWriteSchema } from '@/lib/content/validation';
import { resourceInclude, serializeAdminResource } from '@/lib/content/serialize';

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
    sort: url.searchParams.get('sort') || undefined,
    dir: url.searchParams.get('dir') || undefined,
  });
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));
  const { q, page, pageSize, status, featured, category, sort, dir } = parsed.data;
  const where: Record<string, unknown> = {};
  if (q) where.OR = [{ title: { contains: q } }, { description: { contains: q } }];
  if (status) where.status = status;
  if (featured === 'true') where.isFeatured = true;
  if (category) where.categoryId = category;
  const orderField = ['title', 'status', 'updatedAt', 'publishedAt'].includes(sort || '')
    ? sort!
    : 'updatedAt';
  const [totalItems, rows] = await Promise.all([
    db.resource.count({ where }),
    db.resource.findMany({
      where,
      include: resourceInclude,
      orderBy: { [orderField]: dir === 'asc' ? 'asc' : 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  return paginated(rows.map(serializeAdminResource), { page, pageSize, totalItems });
}

export async function POST(request: Request) {
  const auth = await guardAdminWrite(request, 'content', 'create');
  if (!auth.ok) return auth.error;
  const parsed = resourceWriteSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));
  const data = parsed.data;
  try {
    sanitizeOptionalUrl(data.fileUrl);
    sanitizeOptionalUrl(data.thumbnailUrl);
    sanitizeOptionalUrl(data.externalUrl || null);
  } catch {
    return unsafeUrlError();
  }
  const slug = await uniqueContentSlug('resource', data.title, data.slug);
  const publishAt = parseDate(data.publishAt);
  const resolved = resolveWriteStatus(auth.user, { status: data.status, publishAt });
  const row = await db.resource.create({
    data: {
      title: sanitizePlainText(data.title, 180),
      slug,
      description: data.description ? sanitizePlainText(data.description, 2000) : null,
      content: data.content ? sanitizeMarkdown(data.content, 20_000) : null,
      fileUrl: sanitizeOptionalUrl(data.fileUrl),
      fileName: data.fileName ? sanitizePlainText(data.fileName, 180) : null,
      fileMime: data.fileMime || null,
      fileSize: data.fileSize ?? null,
      thumbnailUrl: sanitizeOptionalUrl(data.thumbnailUrl),
      thumbnailAlt: data.thumbnailAlt ? sanitizePlainText(data.thumbnailAlt, 180) : null,
      externalUrl: data.externalUrl ? sanitizeOptionalUrl(data.externalUrl) : null,
      accessLevel: data.accessLevel || 'public',
      copyrightHolder: data.copyrightHolder
        ? sanitizePlainText(data.copyrightHolder, 180)
        : null,
      license: data.license ? sanitizePlainText(data.license, 120) : null,
      version: data.version ? sanitizePlainText(data.version, 40) : null,
      status: resolved.status,
      isFeatured: data.isFeatured ?? false,
      seoTitle: data.seoTitle ? sanitizePlainText(data.seoTitle, 70) : null,
      seoDescription: data.seoDescription ? sanitizePlainText(data.seoDescription, 160) : null,
      categoryId: data.categoryId ?? null,
      authorId: auth.user.id,
      publishAt,
      publishedAt: resolved.publishedAt,
    },
    include: resourceInclude,
  });
  if (row.isFeatured) await enforceFeaturedLimit('resource', row.id);
  await logContentChange({
    type: resolved.status === 'published' ? 'content.published' : 'content.created',
    entity: 'resource',
    entityId: row.id,
    userId: auth.user.id,
    request,
    details: { slug: row.slug, status: row.status },
  });
  revalidatePublicContent();
  return success(serializeAdminResource(row), 'Resource created.', 201);
}
