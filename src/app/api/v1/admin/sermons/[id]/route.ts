import { db } from '@/lib/db';
import { error, forbidden, notFound, success, validationError } from '@/lib/api/response';
import { readJson } from '@/lib/auth/http';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import {
  canArchiveSermon,
  canDeleteSermon,
  canPublishSermon,
  resolveSermonWrite,
  RESERVED_SERMON_SLUGS,
} from '@/lib/sermons/access';
import {
  enforceFeaturedLimit,
  eventForSermonStatus,
  logContentChange,
  parseDate,
  revalidatePublicContent,
  sanitizeMarkdown,
  sanitizeOptionalUrl,
  sanitizePlainText,
  uniqueContentSlug,
  unsafeUrlError,
} from '@/lib/content/admin-write';
import { formatScriptureLabel, parseApprovedVideo } from '@/lib/sermons/video';
import { formatZodErrors, sermonWriteSchema } from '@/lib/sermons/validation';
import { sermonInclude, serializeSermon } from '@/lib/sermons/serialize';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const auth = await guardAdminRead(request, 'sermons', 'view');
  if (!auth.ok) return auth.error;
  const { id } = await context.params;
  const row = await db.sermon.findUnique({ where: { id }, include: sermonInclude });
  if (!row) return notFound('Sermon');
  return success(serializeSermon(row));
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await guardAdminWrite(request, 'sermons', 'update');
  if (!auth.ok) return auth.error;
  const { id } = await context.params;
  const parsed = sermonWriteSchema.partial().safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));
  const existing = await db.sermon.findUnique({ where: { id } });
  if (!existing) return notFound('Sermon');
  const data = parsed.data;
  if (data.slug && RESERVED_SERMON_SLUGS.has(data.slug)) {
    return error('That slug is reserved.', 409);
  }
  if ((data.status === 'published' || data.status === 'scheduled') && !canPublishSermon(auth.user)) {
    return forbidden('You do not have permission to publish sermons.');
  }
  if (data.status === 'archived' && !canArchiveSermon(auth.user)) return forbidden();
  try {
    if (data.thumbnailUrl !== undefined) sanitizeOptionalUrl(data.thumbnailUrl);
    if (data.audioUrl !== undefined) sanitizeOptionalUrl(data.audioUrl);
    if (data.notesFileUrl !== undefined) sanitizeOptionalUrl(data.notesFileUrl);
    if (data.ogImageUrl !== undefined) sanitizeOptionalUrl(data.ogImageUrl);
  } catch {
    return unsafeUrlError();
  }
  if (data.videoUrl) {
    const video = parseApprovedVideo(data.videoUrl);
    if (!video) return error('Video must be a YouTube or Vimeo URL.', 422);
  }
  const slug =
    data.title || data.slug
      ? await uniqueContentSlug('sermon', data.title || existing.title, data.slug, id)
      : existing.slug;
  const publishAt = data.publishAt !== undefined ? parseDate(data.publishAt) : existing.publishAt;
  const resolved = resolveSermonWrite(auth.user, {
    status: data.status ?? (existing.status as 'draft'),
    publishAt,
  });
  const updated = await db.$transaction(async (tx) => {
    if (data.scriptures) {
      await tx.sermonScripture.deleteMany({ where: { sermonId: id } });
    }
    return tx.sermon.update({
      where: { id },
      data: {
        title: data.title ? sanitizePlainText(data.title, 180) : undefined,
        slug,
        description:
          data.description === undefined
            ? undefined
            : data.description
              ? sanitizeMarkdown(data.description, 10_000)
              : null,
        notes: data.notes === undefined ? undefined : data.notes ? sanitizeMarkdown(data.notes) : null,
        transcript:
          data.transcript === undefined
            ? undefined
            : data.transcript
              ? sanitizePlainText(data.transcript, 200_000)
              : null,
        speakerName:
          data.speakerName === undefined
            ? undefined
            : data.speakerName
              ? sanitizePlainText(data.speakerName, 120)
              : null,
        speakerId: data.speakerId === undefined ? undefined : data.speakerId,
        seriesId: data.seriesId === undefined ? undefined : data.seriesId,
        categoryId: data.categoryId === undefined ? undefined : data.categoryId,
        sermonDate: data.sermonDate ? parseDate(data.sermonDate) ?? undefined : undefined,
        thumbnailUrl: data.thumbnailUrl === undefined ? undefined : sanitizeOptionalUrl(data.thumbnailUrl),
        thumbnailAlt:
          data.thumbnailAlt === undefined
            ? undefined
            : data.thumbnailAlt
              ? sanitizePlainText(data.thumbnailAlt, 180)
              : null,
        audioUrl: data.audioUrl === undefined ? undefined : sanitizeOptionalUrl(data.audioUrl),
        audioFileName:
          data.audioFileName === undefined
            ? undefined
            : data.audioFileName
              ? sanitizePlainText(data.audioFileName, 180)
              : null,
        audioMime: data.audioMime === undefined ? undefined : data.audioMime,
        audioSize: data.audioSize === undefined ? undefined : data.audioSize,
        videoUrl:
          data.videoUrl === undefined
            ? undefined
            : data.videoUrl
              ? parseApprovedVideo(data.videoUrl)?.watchUrl || null
              : null,
        notesFileUrl: data.notesFileUrl === undefined ? undefined : sanitizeOptionalUrl(data.notesFileUrl),
        notesFileName:
          data.notesFileName === undefined
            ? undefined
            : data.notesFileName
              ? sanitizePlainText(data.notesFileName, 180)
              : null,
        notesFileMime: data.notesFileMime === undefined ? undefined : data.notesFileMime,
        notesFileSize: data.notesFileSize === undefined ? undefined : data.notesFileSize,
        contentType: data.contentType === undefined ? undefined : data.contentType,
        accessLevel: data.accessLevel === undefined ? undefined : data.accessLevel,
        durationSeconds: data.durationSeconds === undefined ? undefined : data.durationSeconds,
        copyrightHolder:
          data.copyrightHolder === undefined
            ? undefined
            : data.copyrightHolder
              ? sanitizePlainText(data.copyrightHolder, 180)
              : null,
        license:
          data.license === undefined
            ? undefined
            : data.license
              ? sanitizePlainText(data.license, 120)
              : null,
        sourceAttribution:
          data.sourceAttribution === undefined
            ? undefined
            : data.sourceAttribution
              ? sanitizePlainText(data.sourceAttribution, 500)
              : null,
        status: data.status !== undefined ? resolved.status : undefined,
        isFeatured: data.isFeatured,
        seoTitle:
          data.seoTitle === undefined ? undefined : data.seoTitle ? sanitizePlainText(data.seoTitle, 70) : null,
        seoDescription:
          data.seoDescription === undefined
            ? undefined
            : data.seoDescription
              ? sanitizePlainText(data.seoDescription, 160)
              : null,
        ogImageUrl: data.ogImageUrl === undefined ? undefined : sanitizeOptionalUrl(data.ogImageUrl),
        publishAt: data.publishAt !== undefined ? publishAt : undefined,
        publishedAt: data.status !== undefined ? resolved.publishedAt : undefined,
        scriptures: data.scriptures
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
  });
  if (updated.isFeatured) await enforceFeaturedLimit('sermon', updated.id);
  let type = eventForSermonStatus(existing.status, updated.status);
  if (data.audioUrl && data.audioUrl !== existing.audioUrl) type = 'sermon.audio_uploaded';
  if (data.videoUrl && data.videoUrl !== existing.videoUrl) type = 'sermon.video_updated';
  if (data.notesFileUrl && data.notesFileUrl !== existing.notesFileUrl) type = 'sermon.notes_uploaded';
  await logContentChange({
    type,
    entity: 'sermon',
    entityId: updated.id,
    userId: auth.user.id,
    request,
    details: { slug: updated.slug, status: updated.status },
  });
  revalidatePublicContent([`/sermons/${updated.slug}`]);
  return success(serializeSermon(updated), 'Sermon updated.');
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await guardAdminWrite(request, 'sermons', 'archive');
  if (!auth.ok) return auth.error;
  if (!canArchiveSermon(auth.user) && !canDeleteSermon(auth.user)) return forbidden();
  const { id } = await context.params;
  const existing = await db.sermon.findUnique({ where: { id } });
  if (!existing) return notFound('Sermon');
  const updated = await db.sermon.update({
    where: { id },
    data: { status: 'archived', isFeatured: false },
    include: sermonInclude,
  });
  await logContentChange({
    type: 'sermon.archived',
    entity: 'sermon',
    entityId: id,
    userId: auth.user.id,
    request,
    details: { slug: existing.slug },
  });
  revalidatePublicContent([`/sermons/${existing.slug}`]);
  return success(serializeSermon(updated), 'Sermon archived.');
}
