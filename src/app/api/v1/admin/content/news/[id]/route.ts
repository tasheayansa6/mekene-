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
import { formatZodErrors, newsWriteSchema } from '@/lib/content/validation';
import { newsInclude, serializeAdminNews } from '@/lib/content/serialize';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const auth = await guardAdminRead(request, 'content', 'view');
  if (!auth.ok) return auth.error;
  const { id } = await context.params;
  const article = await db.newsArticle.findUnique({ where: { id }, include: newsInclude });
  if (!article) return notFound('Article');
  return success(serializeAdminNews(article));
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await guardAdminWrite(request, 'content', 'update');
  if (!auth.ok) return auth.error;
  const { id } = await context.params;
  const parsed = newsWriteSchema.partial().safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));
  const existing = await db.newsArticle.findUnique({ where: { id } });
  if (!existing) return notFound('Article');
  const data = parsed.data;
  if ((data.status === 'published' || data.status === 'scheduled') && !canPublishContent(auth.user)) {
    return forbidden('You do not have permission to publish content.');
  }
  if (data.status === 'archived' && !canArchiveContent(auth.user)) return forbidden();
  try {
    if (data.featuredImageUrl !== undefined) sanitizeOptionalUrl(data.featuredImageUrl);
    if (data.ogImageUrl !== undefined) sanitizeOptionalUrl(data.ogImageUrl);
  } catch {
    return unsafeUrlError();
  }
  const slug =
    data.title || data.slug
      ? await uniqueContentSlug('newsArticle', data.title || existing.title, data.slug, id)
      : existing.slug;
  const publishAt = data.publishAt !== undefined ? parseDate(data.publishAt) : existing.publishAt;
  const resolved = resolveWriteStatus(auth.user, {
    status: data.status ?? (existing.status as 'draft'),
    publishAt,
  });

  const updated = await db.$transaction(async (tx) => {
    if (data.tagIds) {
      await tx.newsArticleTag.deleteMany({ where: { newsId: id } });
    }
    return tx.newsArticle.update({
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
        seoTitle:
          data.seoTitle === undefined ? undefined : data.seoTitle ? sanitizePlainText(data.seoTitle, 70) : null,
        seoDescription:
          data.seoDescription === undefined
            ? undefined
            : data.seoDescription
              ? sanitizePlainText(data.seoDescription, 160)
              : null,
        ogImageUrl: data.ogImageUrl === undefined ? undefined : sanitizeOptionalUrl(data.ogImageUrl),
        categoryId: data.categoryId === undefined ? undefined : data.categoryId,
        publishAt: data.publishAt !== undefined ? publishAt : undefined,
        publishedAt: data.status !== undefined ? resolved.publishedAt : undefined,
        tags: data.tagIds ? { create: data.tagIds.map((tagId) => ({ tagId })) } : undefined,
      },
      include: newsInclude,
    });
  });

  if (updated.isFeatured) await enforceFeaturedLimit('newsArticle', updated.id);
  await logContentChange({
    type: eventForStatusChange(existing.status, updated.status),
    entity: 'news_article',
    entityId: updated.id,
    userId: auth.user.id,
    request,
    details: { slug: updated.slug, status: updated.status },
  });
  revalidatePublicContent([`/news/${updated.slug}`]);
  return success(serializeAdminNews(updated), 'News article updated.');
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await guardAdminWrite(request, 'content', 'archive');
  if (!auth.ok) return auth.error;
  if (!canArchiveContent(auth.user) && !canDeleteContent(auth.user)) return forbidden();
  const { id } = await context.params;
  const existing = await db.newsArticle.findUnique({ where: { id } });
  if (!existing) return notFound('Article');
  const updated = await db.newsArticle.update({
    where: { id },
    data: { status: 'archived', isFeatured: false },
    include: newsInclude,
  });
  await logContentChange({
    type: 'content.archived',
    entity: 'news_article',
    entityId: id,
    userId: auth.user.id,
    request,
    details: { slug: existing.slug },
  });
  revalidatePublicContent([`/news/${existing.slug}`]);
  return success(serializeAdminNews(updated), 'Article archived.');
}
