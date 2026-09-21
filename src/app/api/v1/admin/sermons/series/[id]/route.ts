import { db } from '@/lib/db';
import { forbidden, notFound, success, validationError } from '@/lib/api/response';
import { readJson } from '@/lib/auth/http';
import { guardAdminWrite } from '@/lib/admin/guard';
import { canArchiveSermon, resolveSermonWrite } from '@/lib/sermons/access';
import {
  logContentChange,
  parseDate,
  revalidatePublicContent,
  sanitizeMarkdown,
  sanitizeOptionalUrl,
  sanitizePlainText,
  uniqueContentSlug,
  unsafeUrlError,
} from '@/lib/content/admin-write';
import { formatZodErrors, seriesWriteSchema } from '@/lib/sermons/validation';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await guardAdminWrite(request, 'sermons', 'update');
  if (!auth.ok) return auth.error;
  const { id } = await context.params;
  const parsed = seriesWriteSchema.partial().safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));
  const existing = await db.sermonSeries.findUnique({ where: { id } });
  if (!existing) return notFound('Series');
  try {
    if (parsed.data.imageUrl !== undefined) sanitizeOptionalUrl(parsed.data.imageUrl);
  } catch {
    return unsafeUrlError();
  }
  const slug =
    parsed.data.name || parsed.data.slug
      ? await uniqueContentSlug('sermonSeries', parsed.data.name || existing.name, parsed.data.slug, id)
      : existing.slug;
  const publishAt = parsed.data.publishAt !== undefined ? parseDate(parsed.data.publishAt) : existing.publishAt;
  const resolved = resolveSermonWrite(auth.user, {
    status: parsed.data.status ?? (existing.status as 'draft'),
    publishAt,
  });
  const updated = await db.sermonSeries.update({
    where: { id },
    data: {
      name: parsed.data.name ? sanitizePlainText(parsed.data.name, 120) : undefined,
      slug,
      description:
        parsed.data.description === undefined
          ? undefined
          : parsed.data.description
            ? sanitizeMarkdown(parsed.data.description, 4000)
            : null,
      imageUrl: parsed.data.imageUrl === undefined ? undefined : sanitizeOptionalUrl(parsed.data.imageUrl),
      imageAlt:
        parsed.data.imageAlt === undefined
          ? undefined
          : parsed.data.imageAlt
            ? sanitizePlainText(parsed.data.imageAlt, 180)
            : null,
      status: parsed.data.status !== undefined ? resolved.status : undefined,
      seoTitle:
        parsed.data.seoTitle === undefined
          ? undefined
          : parsed.data.seoTitle
            ? sanitizePlainText(parsed.data.seoTitle, 70)
            : null,
      seoDescription:
        parsed.data.seoDescription === undefined
          ? undefined
          : parsed.data.seoDescription
            ? sanitizePlainText(parsed.data.seoDescription, 160)
            : null,
      publishAt: parsed.data.publishAt !== undefined ? publishAt : undefined,
      publishedAt: parsed.data.status !== undefined ? resolved.publishedAt : undefined,
    },
  });
  await logContentChange({
    type: 'sermon.updated',
    entity: 'sermon_series',
    entityId: id,
    userId: auth.user.id,
    request,
    details: { slug: updated.slug },
  });
  revalidatePublicContent([`/sermons/series/${updated.slug}`]);
  return success(updated, 'Series updated.');
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await guardAdminWrite(request, 'sermons', 'delete');
  if (!auth.ok) return auth.error;
  if (!canArchiveSermon(auth.user)) return forbidden();
  const { id } = await context.params;
  const existing = await db.sermonSeries.findUnique({ where: { id } });
  if (!existing) return notFound('Series');
  await db.sermonSeries.update({
    where: { id },
    data: { status: 'archived' },
  });
  await logContentChange({
    type: 'sermon.archived',
    entity: 'sermon_series',
    entityId: id,
    userId: auth.user.id,
    request,
    details: { slug: existing.slug },
  });
  revalidatePublicContent();
  return success({ id }, 'Series archived.');
}
