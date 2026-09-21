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
import { formatZodErrors, resourceWriteSchema } from '@/lib/content/validation';
import { resourceInclude, serializeAdminResource } from '@/lib/content/serialize';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const auth = await guardAdminRead(request, 'content', 'view');
  if (!auth.ok) return auth.error;
  const { id } = await context.params;
  const row = await db.resource.findUnique({ where: { id }, include: resourceInclude });
  if (!row) return notFound('Resource');
  return success(serializeAdminResource(row));
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await guardAdminWrite(request, 'content', 'update');
  if (!auth.ok) return auth.error;
  const { id } = await context.params;
  const parsed = resourceWriteSchema.partial().safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));
  const existing = await db.resource.findUnique({ where: { id } });
  if (!existing) return notFound('Resource');
  const data = parsed.data;
  if ((data.status === 'published' || data.status === 'scheduled') && !canPublishContent(auth.user)) {
    return forbidden('You do not have permission to publish content.');
  }
  if (data.status === 'archived' && !canArchiveContent(auth.user)) return forbidden();
  try {
    if (data.fileUrl !== undefined) sanitizeOptionalUrl(data.fileUrl);
    if (data.thumbnailUrl !== undefined) sanitizeOptionalUrl(data.thumbnailUrl);
    if (data.externalUrl !== undefined) sanitizeOptionalUrl(data.externalUrl || null);
  } catch {
    return unsafeUrlError();
  }
  const slug =
    data.title || data.slug
      ? await uniqueContentSlug('resource', data.title || existing.title, data.slug, id)
      : existing.slug;
  const publishAt = data.publishAt !== undefined ? parseDate(data.publishAt) : existing.publishAt;
  const resolved = resolveWriteStatus(auth.user, {
    status: data.status ?? (existing.status as 'draft'),
    publishAt,
  });
  const updated = await db.resource.update({
    where: { id },
    data: {
      title: data.title ? sanitizePlainText(data.title, 180) : undefined,
      slug,
      description:
        data.description === undefined
          ? undefined
          : data.description
            ? sanitizePlainText(data.description, 2000)
            : null,
      content: data.content === undefined ? undefined : data.content ? sanitizeMarkdown(data.content, 20_000) : null,
      fileUrl: data.fileUrl === undefined ? undefined : sanitizeOptionalUrl(data.fileUrl),
      fileName:
        data.fileName === undefined ? undefined : data.fileName ? sanitizePlainText(data.fileName, 180) : null,
      fileMime: data.fileMime === undefined ? undefined : data.fileMime,
      fileSize: data.fileSize === undefined ? undefined : data.fileSize,
      thumbnailUrl: data.thumbnailUrl === undefined ? undefined : sanitizeOptionalUrl(data.thumbnailUrl),
      thumbnailAlt:
        data.thumbnailAlt === undefined
          ? undefined
          : data.thumbnailAlt
            ? sanitizePlainText(data.thumbnailAlt, 180)
            : null,
      externalUrl: data.externalUrl === undefined ? undefined : sanitizeOptionalUrl(data.externalUrl || null),
      accessLevel: data.accessLevel === undefined ? undefined : data.accessLevel,
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
      version:
        data.version === undefined
          ? undefined
          : data.version
            ? sanitizePlainText(data.version, 40)
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
      categoryId: data.categoryId === undefined ? undefined : data.categoryId,
      publishAt: data.publishAt !== undefined ? publishAt : undefined,
      publishedAt: data.status !== undefined ? resolved.publishedAt : undefined,
    },
    include: resourceInclude,
  });
  if (updated.isFeatured) await enforceFeaturedLimit('resource', updated.id);
  await logContentChange({
    type: eventForStatusChange(existing.status, updated.status),
    entity: 'resource',
    entityId: updated.id,
    userId: auth.user.id,
    request,
    details: { slug: updated.slug, status: updated.status },
  });
  revalidatePublicContent();
  return success(serializeAdminResource(updated), 'Resource updated.');
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await guardAdminWrite(request, 'content', 'archive');
  if (!auth.ok) return auth.error;
  if (!canArchiveContent(auth.user) && !canDeleteContent(auth.user)) return forbidden();
  const { id } = await context.params;
  const existing = await db.resource.findUnique({ where: { id } });
  if (!existing) return notFound('Resource');
  const updated = await db.resource.update({
    where: { id },
    data: { status: 'archived', isFeatured: false },
    include: resourceInclude,
  });
  await logContentChange({
    type: 'content.archived',
    entity: 'resource',
    entityId: id,
    userId: auth.user.id,
    request,
    details: { slug: existing.slug },
  });
  revalidatePublicContent();
  return success(serializeAdminResource(updated), 'Resource archived.');
}
