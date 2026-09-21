import { db } from '@/lib/db';
import { error, forbidden, notFound, success, validationError } from '@/lib/api/response';
import { readJson } from '@/lib/auth/http';
import { guardAdminWrite } from '@/lib/admin/guard';
import { canDeleteContent } from '@/lib/content/access';
import { logContentChange, sanitizePlainText, uniqueContentSlug } from '@/lib/content/admin-write';
import { categoryWriteSchema, formatZodErrors } from '@/lib/content/validation';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await guardAdminWrite(request, 'content', 'update');
  if (!auth.ok) return auth.error;
  const { id } = await context.params;
  const parsed = categoryWriteSchema.partial().safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));
  const existing = await db.contentCategory.findUnique({ where: { id } });
  if (!existing) return notFound('Category');
  const data = parsed.data;
  const slug =
    data.name || data.slug
      ? await uniqueContentSlug('contentCategory', data.name || existing.name, data.slug, id)
      : existing.slug;
  const scope = data.scope || existing.scope;
  const clash = await db.contentCategory.findFirst({
    where: { scope, slug, id: { not: id } },
  });
  if (clash) return error('A category with this slug already exists in this group.', 409);
  const updated = await db.contentCategory.update({
    where: { id },
    data: {
      name: data.name ? sanitizePlainText(data.name, 80) : undefined,
      slug,
      description:
        data.description === undefined
          ? undefined
          : data.description
            ? sanitizePlainText(data.description, 400)
            : null,
      scope: data.scope,
      sortOrder: data.sortOrder,
    },
  });
  await logContentChange({
    type: 'content.updated',
    entity: 'content_category',
    entityId: id,
    userId: auth.user.id,
    request,
    details: { name: updated.name },
  });
  return success(updated, 'Category updated.');
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await guardAdminWrite(request, 'content', 'delete');
  if (!auth.ok) return auth.error;
  if (!canDeleteContent(auth.user)) return forbidden();
  const { id } = await context.params;
  const existing = await db.contentCategory.findUnique({
    where: { id },
    include: { _count: { select: { newsArticles: true, resources: true } } },
  });
  if (!existing) return notFound('Category');
  if (existing._count.newsArticles + existing._count.resources > 0) {
    return error('Remove this category from content before deleting it.', 409);
  }
  await db.contentCategory.delete({ where: { id } });
  await logContentChange({
    type: 'content.deleted',
    entity: 'content_category',
    entityId: id,
    userId: auth.user.id,
    request,
    details: { name: existing.name },
  });
  return success({ id }, 'Category deleted.');
}
