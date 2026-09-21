import { db } from '@/lib/db';
import { recordSlugChange } from '@/lib/cms/redirects';
import { saveRevision } from '@/lib/cms/revisions';
import { forbidden, notFound, success, validationError } from '@/lib/api/response';
import { readJson } from '@/lib/auth/http';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { canArchiveContent, canDeleteContent, canPublishContent } from '@/lib/content/access';
import {
  enforceFeaturedLimit,
  eventForStatusChange,
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
import { formatZodErrors, pageWriteSchema } from '@/lib/content/validation';
import { pageInclude, serializeAdminPage } from '@/lib/content/serialize';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const auth = await guardAdminRead(request, 'content', 'view');
  if (!auth.ok) return auth.error;
  const { id } = await context.params;
  const page = await db.cmsPage.findUnique({ where: { id }, include: pageInclude });
  if (!page) return notFound('Page');
  return success(serializeAdminPage(page));
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await guardAdminWrite(request, 'content', 'update');
  if (!auth.ok) return auth.error;
  const { id } = await context.params;
  const parsed = pageWriteSchema.partial().safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const existing = await db.cmsPage.findUnique({ where: { id } });
  if (!existing) return notFound('Page');

  const data = parsed.data;
  if (data.status === 'published' || data.status === 'scheduled') {
    if (!canPublishContent(auth.user)) return forbidden('You do not have permission to publish content.');
  }
  if (data.status === 'archived' && !canArchiveContent(auth.user)) {
    return forbidden('You do not have permission to archive content.');
  }

  const slug =
    data.title || data.slug
      ? await uniqueContentSlug('cmsPage', data.title || existing.title, data.slug, id)
      : existing.slug;
  const reserved = reservedPageError(slug);
  if (reserved) return reserved;

  try {
    if (data.featuredImageUrl !== undefined) sanitizeOptionalUrl(data.featuredImageUrl);
    if (data.ogImageUrl !== undefined) sanitizeOptionalUrl(data.ogImageUrl);
  } catch {
    return unsafeUrlError();
  }

  const publishAt = data.publishAt !== undefined ? parseDate(data.publishAt) : existing.publishAt;
  const resolved = resolveWriteStatus(auth.user, {
    status: data.status ?? (existing.status as 'draft'),
    publishAt,
  });

  const contentChanging =
    data.content !== undefined || data.title !== undefined || data.slug !== undefined;
  if (contentChanging) {
    await saveRevision({
      entityType: 'cms_page',
      entityId: existing.id,
      title: existing.title,
      slug: existing.slug,
      content: existing.content,
      snapshot: {
        title: existing.title,
        slug: existing.slug,
        excerpt: existing.excerpt,
        content: existing.content,
        status: existing.status,
        seoTitle: existing.seoTitle,
        seoDescription: existing.seoDescription,
      },
      createdById: auth.user.id,
    });
  }

  const updated = await db.cmsPage.update({
    where: { id },
    data: {
      title: data.title ? sanitizePlainText(data.title, 180) : undefined,
      slug,
      excerpt: data.excerpt === undefined ? undefined : data.excerpt ? sanitizePlainText(data.excerpt, 400) : null,
      content: data.content ? sanitizeMarkdown(data.content) : undefined,
      featuredImageUrl:
        data.featuredImageUrl === undefined ? undefined : sanitizeOptionalUrl(data.featuredImageUrl),
      featuredImageAlt:
        data.featuredImageAlt === undefined
          ? undefined
          : data.featuredImageAlt
            ? sanitizePlainText(data.featuredImageAlt, 180)
            : null,
      status: data.status !== undefined ? resolved.status : undefined,
      isFeatured: data.isFeatured,
      sortOrder: data.sortOrder,
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
    },
    include: pageInclude,
  });

  if (updated.isFeatured) await enforceFeaturedLimit('cmsPage', updated.id);

  if (slug !== existing.slug) {
    await recordSlugChange({
      entityType: 'cms_page',
      entityId: updated.id,
      fromSlug: existing.slug,
      toSlug: updated.slug,
    });
  }

  await logContentChange({
    type: eventForStatusChange(existing.status, updated.status),
    entity: 'cms_page',
    entityId: updated.id,
    userId: auth.user.id,
    request,
    details: { slug: updated.slug, status: updated.status },
  });
  revalidatePublicContent([`/pages/${existing.slug}`, `/pages/${updated.slug}`]);
  return success(serializeAdminPage(updated), 'Page updated.');
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await guardAdminWrite(request, 'content', 'archive');
  if (!auth.ok) return auth.error;
  if (!canArchiveContent(auth.user) && !canDeleteContent(auth.user)) return forbidden();
  const { id } = await context.params;
  const existing = await db.cmsPage.findUnique({ where: { id } });
  if (!existing) return notFound('Page');

  const updated = await db.cmsPage.update({
    where: { id },
    data: { status: 'archived', isFeatured: false },
    include: pageInclude,
  });
  await logContentChange({
    type: 'content.archived',
    entity: 'cms_page',
    entityId: id,
    userId: auth.user.id,
    request,
    details: { slug: existing.slug },
  });
  revalidatePublicContent([`/pages/${existing.slug}`]);
  return success(serializeAdminPage(updated), 'Page archived. It is no longer public.');
}
