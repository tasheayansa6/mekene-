import { db } from '@/lib/db';
import { paginated, success, validationError } from '@/lib/api/response';
import { readJson } from '@/lib/auth/http';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import {
  enforceFeaturedLimit,
  logContentChange,
  parseDate,
  revalidatePublicContent,
  sanitizeMarkdown,
  sanitizeOptionalUrl,
  sanitizePlainText,
  uniqueContentSlug,
  unsafeUrlError,
} from '@/lib/content/admin-write';
import { resolveSermonWrite } from '@/lib/sermons/access';
import { formatScriptureLabel, parseApprovedVideo } from '@/lib/sermons/video';
import { formatZodErrors, adminSermonListSchema, sermonWriteSchema } from '@/lib/sermons/validation';
import { RESERVED_SERMON_SLUGS } from '@/lib/sermons/access';
import { sermonInclude, serializeSermon } from '@/lib/sermons/serialize';
import { error } from '@/lib/api/response';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'sermons', 'view');
  if (!auth.ok) return auth.error;
  const url = new URL(request.url);
  const parsed = adminSermonListSchema.safeParse({
    q: url.searchParams.get('q') || undefined,
    page: url.searchParams.get('page') || 1,
    pageSize: url.searchParams.get('pageSize') || 20,
    status: url.searchParams.get('status') || undefined,
    speaker: url.searchParams.get('speaker') || undefined,
    series: url.searchParams.get('series') || undefined,
    category: url.searchParams.get('category') || undefined,
    contentType: url.searchParams.get('contentType') || undefined,
    accessLevel: url.searchParams.get('accessLevel') || undefined,
    featured: url.searchParams.get('featured') || undefined,
    sort: url.searchParams.get('sort') || undefined,
    dir: url.searchParams.get('dir') || undefined,
  });
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));
  const {
    q,
    page,
    pageSize,
    status,
    speaker,
    series,
    category,
    contentType,
    accessLevel,
    featured,
    sort,
    dir,
  } = parsed.data;
  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { title: { contains: q } },
      { description: { contains: q } },
      { transcript: { contains: q } },
      { speakerName: { contains: q } },
      { speaker: { OR: [{ firstName: { contains: q } }, { lastName: { contains: q } }] } },
      { series: { name: { contains: q } } },
      { scriptures: { some: { OR: [{ label: { contains: q } }, { book: { contains: q } }] } } },
    ];
  }
  if (status) where.status = status;
  if (speaker) where.speakerId = speaker;
  if (series) where.seriesId = series;
  if (category) where.categoryId = category;
  if (contentType) where.contentType = contentType;
  if (accessLevel) where.accessLevel = accessLevel;
  if (featured === 'true') where.isFeatured = true;
  const orderField = ['title', 'status', 'updatedAt', 'sermonDate'].includes(sort || '')
    ? sort!
    : 'updatedAt';

  const [totalItems, rows] = await Promise.all([
    db.sermon.count({ where }),
    db.sermon.findMany({
      where,
      include: sermonInclude,
      orderBy: { [orderField]: dir === 'asc' ? 'asc' : 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  return paginated(rows.map((row) => serializeSermon(row)), { page, pageSize, totalItems });
}

export async function POST(request: Request) {
  const auth = await guardAdminWrite(request, 'sermons', 'create');
  if (!auth.ok) return auth.error;
  const parsed = sermonWriteSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));
  const data = parsed.data;
  if (data.slug && RESERVED_SERMON_SLUGS.has(data.slug)) {
    return error('That slug is reserved.', 409);
  }
  try {
    sanitizeOptionalUrl(data.thumbnailUrl);
    sanitizeOptionalUrl(data.audioUrl);
    sanitizeOptionalUrl(data.notesFileUrl);
    sanitizeOptionalUrl(data.ogImageUrl);
  } catch {
    return unsafeUrlError();
  }
  if (data.videoUrl) {
    const video = parseApprovedVideo(data.videoUrl);
    if (!video) return error('Video must be a YouTube or Vimeo URL.', 422);
  }
  const sermonDate = parseDate(data.sermonDate);
  if (!sermonDate) return validationError({ sermonDate: ['Sermon date is required'] });
  const slug = await uniqueContentSlug('sermon', data.title, data.slug);
  const publishAt = parseDate(data.publishAt);
  const resolved = resolveSermonWrite(auth.user, { status: data.status, publishAt });
  const row = await db.sermon.create({
    data: {
      title: sanitizePlainText(data.title, 180),
      slug,
      description: data.description ? sanitizeMarkdown(data.description, 10_000) : null,
      notes: data.notes ? sanitizeMarkdown(data.notes) : null,
      transcript: data.transcript ? sanitizePlainText(data.transcript, 200_000) : null,
      speakerName: data.speakerName ? sanitizePlainText(data.speakerName, 120) : null,
      speakerId: data.speakerId || null,
      seriesId: data.seriesId || null,
      categoryId: data.categoryId || null,
      sermonDate,
      thumbnailUrl: sanitizeOptionalUrl(data.thumbnailUrl),
      thumbnailAlt: data.thumbnailAlt ? sanitizePlainText(data.thumbnailAlt, 180) : null,
      audioUrl: sanitizeOptionalUrl(data.audioUrl),
      audioFileName: data.audioFileName ? sanitizePlainText(data.audioFileName, 180) : null,
      audioMime: data.audioMime || null,
      audioSize: data.audioSize ?? null,
      videoUrl: data.videoUrl ? parseApprovedVideo(data.videoUrl)?.watchUrl || null : null,
      notesFileUrl: sanitizeOptionalUrl(data.notesFileUrl),
      notesFileName: data.notesFileName ? sanitizePlainText(data.notesFileName, 180) : null,
      notesFileMime: data.notesFileMime || null,
      notesFileSize: data.notesFileSize ?? null,
      contentType: data.contentType || 'sermon',
      accessLevel: data.accessLevel || 'public',
      durationSeconds: data.durationSeconds ?? null,
      copyrightHolder: data.copyrightHolder
        ? sanitizePlainText(data.copyrightHolder, 180)
        : null,
      license: data.license ? sanitizePlainText(data.license, 120) : null,
      sourceAttribution: data.sourceAttribution
        ? sanitizePlainText(data.sourceAttribution, 500)
        : null,
      status: resolved.status,
      isFeatured: data.isFeatured ?? false,
      seoTitle: data.seoTitle ? sanitizePlainText(data.seoTitle, 70) : null,
      seoDescription: data.seoDescription ? sanitizePlainText(data.seoDescription, 160) : null,
      ogImageUrl: sanitizeOptionalUrl(data.ogImageUrl),
      authorId: auth.user.id,
      publishAt,
      publishedAt: resolved.publishedAt,
      scriptures: data.scriptures?.length
        ? {
            create: data.scriptures.map((item, index) => ({
              book: sanitizePlainText(item.book, 80),
              chapter: item.chapter ?? null,
              verseStart: item.verseStart ?? null,
              verseEnd: item.verseEnd ?? null,
              label: formatScriptureLabel(item),
              sortOrder: item.sortOrder ?? index,
            })),
          }
        : undefined,
    },
    include: sermonInclude,
  });
  if (row.isFeatured) await enforceFeaturedLimit('sermon', row.id);
  await logContentChange({
    type: resolved.status === 'published' ? 'sermon.published' : 'sermon.created',
    entity: 'sermon',
    entityId: row.id,
    userId: auth.user.id,
    request,
    details: { slug: row.slug, status: row.status },
  });
  revalidatePublicContent([`/sermons/${row.slug}`]);
  return success(serializeSermon(row), 'Sermon created as a draft unless you published it.', 201);
}
