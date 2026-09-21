import { db } from '@/lib/db';
import { forbidden, notFound, success, validationError } from '@/lib/api/response';
import { readJson } from '@/lib/auth/http';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { canArchiveContent, canDeleteContent, canPublishContent } from '@/lib/content/access';
import {
  enforceFeaturedLimit,
  eventForStatusChange,
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
import { announcementWriteSchema, formatZodErrors } from '@/lib/content/validation';
import { announcementInclude, serializeAdminAnnouncement } from '@/lib/content/serialize';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const auth = await guardAdminRead(request, 'content', 'view');
  if (!auth.ok) return auth.error;
  const { id } = await context.params;
  const row = await db.announcement.findUnique({ where: { id }, include: announcementInclude });
  if (!row) return notFound('Announcement');
  return success(serializeAdminAnnouncement(row));
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await guardAdminWrite(request, 'content', 'update');
  if (!auth.ok) return auth.error;
  const { id } = await context.params;
  const parsed = announcementWriteSchema.partial().safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));
  const existing = await db.announcement.findUnique({ where: { id } });
  if (!existing) return notFound('Announcement');
  const data = parsed.data;
  if ((data.status === 'published' || data.status === 'scheduled') && !canPublishContent(auth.user)) {
    return forbidden('You do not have permission to publish content.');
  }
  if (data.status === 'archived' && !canArchiveContent(auth.user)) return forbidden();
  try {
    if (data.featuredImageUrl !== undefined) sanitizeOptionalUrl(data.featuredImageUrl);
  } catch {
    return unsafeUrlError();
  }
  const startAt = data.startAt !== undefined ? parseDate(data.startAt) : existing.startAt;
  const endAt = data.endAt !== undefined ? parseDate(data.endAt) : existing.endAt;
  if (startAt && endAt && endAt <= startAt) {
    return validationError({ endAt: ['End date must be after the start date'] });
  }
  const slug =
    data.title || data.slug
      ? await uniqueContentSlug('announcement', data.title || existing.title, data.slug, id)
      : existing.slug;
  const publishAt = data.publishAt !== undefined ? parseDate(data.publishAt) : existing.publishAt;
  const resolved = resolveWriteStatus(auth.user, {
    status: data.status ?? (existing.status as 'draft'),
    publishAt,
  });
  const updated = await db.announcement.update({
    where: { id },
    data: {
      title: data.title ? sanitizePlainText(data.title, 180) : undefined,
      slug,
      excerpt: data.excerpt ? sanitizePlainText(data.excerpt, 280) : undefined,
      content: data.content ? sanitizeMarkdown(data.content, 20_000) : undefined,
      priority: data.priority,
      status: data.status !== undefined ? resolved.status : undefined,
      startAt: data.startAt !== undefined ? startAt ?? undefined : undefined,
      endAt: data.endAt !== undefined ? endAt : undefined,
      isFeatured: data.isFeatured,
      seoTitle:
        data.seoTitle === undefined ? undefined : data.seoTitle ? sanitizePlainText(data.seoTitle, 70) : null,
      seoDescription:
        data.seoDescription === undefined
          ? undefined
          : data.seoDescription
            ? sanitizePlainText(data.seoDescription, 160)
            : null,
      featuredImageUrl:
        data.featuredImageUrl === undefined ? undefined : sanitizeOptionalUrl(data.featuredImageUrl),
      featuredImageAlt:
        data.featuredImageAlt === undefined
          ? undefined
          : data.featuredImageAlt
            ? sanitizePlainText(data.featuredImageAlt, 180)
            : null,
      publishAt: data.publishAt !== undefined ? publishAt : undefined,
      publishedAt: data.status !== undefined ? resolved.publishedAt : undefined,
    },
    include: announcementInclude,
  });
  if (updated.isFeatured) await enforceFeaturedLimit('announcement', updated.id);
  await logContentChange({
    type: eventForStatusChange(existing.status, updated.status),
    entity: 'announcement',
    entityId: updated.id,
    userId: auth.user.id,
    request,
    details: { slug: updated.slug, status: updated.status },
  });
  revalidatePublicContent();
  return success(serializeAdminAnnouncement(updated), 'Announcement updated.');
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await guardAdminWrite(request, 'content', 'archive');
  if (!auth.ok) return auth.error;
  if (!canArchiveContent(auth.user) && !canDeleteContent(auth.user)) return forbidden();
  const { id } = await context.params;
  const existing = await db.announcement.findUnique({ where: { id } });
  if (!existing) return notFound('Announcement');
  const updated = await db.announcement.update({
    where: { id },
    data: { status: 'archived', isFeatured: false },
    include: announcementInclude,
  });
  await logContentChange({
    type: 'content.archived',
    entity: 'announcement',
    entityId: id,
    userId: auth.user.id,
    request,
    details: { slug: existing.slug },
  });
  revalidatePublicContent();
  return success(serializeAdminAnnouncement(updated), 'Announcement archived.');
}
