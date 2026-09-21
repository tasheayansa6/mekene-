import { db } from '@/lib/db';
import { error, forbidden, notFound, success, validationError } from '@/lib/api/response';
import { readJson } from '@/lib/auth/http';
import { guardAdminWrite } from '@/lib/admin/guard';
import { canDeleteSermon } from '@/lib/sermons/access';
import { logContentChange, sanitizePlainText, uniqueContentSlug } from '@/lib/content/admin-write';
import { formatZodErrors, sermonCategoryWriteSchema } from '@/lib/sermons/validation';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await guardAdminWrite(request, 'sermons', 'update');
  if (!auth.ok) return auth.error;
  const { id } = await context.params;
  const parsed = sermonCategoryWriteSchema.partial().safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));
  const existing = await db.sermonCategory.findUnique({ where: { id } });
  if (!existing) return notFound('Category');
  const slug =
    parsed.data.name || parsed.data.slug
      ? await uniqueContentSlug('sermonCategory', parsed.data.name || existing.name, parsed.data.slug, id)
      : existing.slug;
  const clash = await db.sermonCategory.findFirst({ where: { slug, id: { not: id } } });
  if (clash) return error('A category with this slug already exists.', 409);
  const updated = await db.sermonCategory.update({
    where: { id },
    data: {
      name: parsed.data.name ? sanitizePlainText(parsed.data.name, 80) : undefined,
      slug,
      description:
        parsed.data.description === undefined
          ? undefined
          : parsed.data.description
            ? sanitizePlainText(parsed.data.description, 400)
            : null,
      sortOrder: parsed.data.sortOrder,
    },
  });
  await logContentChange({
    type: 'sermon.updated',
    entity: 'sermon_category',
    entityId: id,
    userId: auth.user.id,
    request,
    details: { name: updated.name },
  });
  return success(updated, 'Category updated.');
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await guardAdminWrite(request, 'sermons', 'delete');
  if (!auth.ok) return auth.error;
  if (!canDeleteSermon(auth.user)) return forbidden();
  const { id } = await context.params;
  const existing = await db.sermonCategory.findUnique({
    where: { id },
    include: { _count: { select: { sermons: true } } },
  });
  if (!existing) return notFound('Category');
  if (existing._count.sermons > 0) {
    return error('Remove this category from sermons before deleting it.', 409);
  }
  await db.sermonCategory.delete({ where: { id } });
  await logContentChange({
    type: 'content.deleted',
    entity: 'sermon_category',
    entityId: id,
    userId: auth.user.id,
    request,
    details: { name: existing.name },
  });
  return success({ id }, 'Category deleted.');
}
