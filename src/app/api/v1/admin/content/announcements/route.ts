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
import { announcementWriteSchema, contentListSchema, formatZodErrors } from '@/lib/content/validation';
import { announcementInclude, serializeAdminAnnouncement } from '@/lib/content/serialize';

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
  const where: Record<string, unknown> = {};
  if (q) where.OR = [{ title: { contains: q } }, { excerpt: { contains: q } }];
  if (status) where.status = status;
  if (featured === 'true') where.isFeatured = true;
  const orderField = ['title', 'status', 'updatedAt', 'startAt', 'priority'].includes(sort || '')
    ? sort!
    : 'updatedAt';

  const [totalItems, rows] = await Promise.all([
    db.announcement.count({ where }),
    db.announcement.findMany({
      where,
      include: announcementInclude,
      orderBy: { [orderField]: dir === 'asc' ? 'asc' : 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  return paginated(rows.map(serializeAdminAnnouncement), { page, pageSize, totalItems });
}

export async function POST(request: Request) {
  const auth = await guardAdminWrite(request, 'content', 'create');
  if (!auth.ok) return auth.error;
  const parsed = announcementWriteSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));
  const data = parsed.data;
  const startAt = parseDate(data.startAt);
  const endAt = parseDate(data.endAt);
  if (!startAt) return validationError({ startAt: ['Start date is required'] });
  if (endAt && endAt <= startAt) {
    return validationError({ endAt: ['End date must be after the start date'] });
  }
  try {
    sanitizeOptionalUrl(data.featuredImageUrl);
  } catch {
    return unsafeUrlError();
  }
  const slug = await uniqueContentSlug('announcement', data.title, data.slug);
  const publishAt = parseDate(data.publishAt);
  const resolved = resolveWriteStatus(auth.user, { status: data.status, publishAt });
  const row = await db.announcement.create({
    data: {
      title: sanitizePlainText(data.title, 180),
      slug,
      excerpt: sanitizePlainText(data.excerpt, 280),
      content: sanitizeMarkdown(data.content, 20_000),
      priority: data.priority || 'normal',
      status: resolved.status,
      startAt,
      endAt,
      isFeatured: data.isFeatured ?? false,
      seoTitle: data.seoTitle ? sanitizePlainText(data.seoTitle, 70) : null,
      seoDescription: data.seoDescription ? sanitizePlainText(data.seoDescription, 160) : null,
      featuredImageUrl: sanitizeOptionalUrl(data.featuredImageUrl),
      featuredImageAlt: data.featuredImageAlt ? sanitizePlainText(data.featuredImageAlt, 180) : null,
      authorId: auth.user.id,
      publishAt,
      publishedAt: resolved.publishedAt,
    },
    include: announcementInclude,
  });
  if (row.isFeatured) await enforceFeaturedLimit('announcement', row.id);
  await logContentChange({
    type: 'announcement.created',
    entity: 'announcement',
    entityId: row.id,
    userId: auth.user.id,
    request,
    details: { slug: row.slug, status: row.status },
  });
  revalidatePublicContent();
  return success(serializeAdminAnnouncement(row), 'Announcement created.', 201);
}
