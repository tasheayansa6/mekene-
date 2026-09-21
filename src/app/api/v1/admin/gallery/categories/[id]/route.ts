import { db } from '@/lib/db';
import { error, notFound, success, validationError } from '@/lib/api/response';
import { readJson } from '@/lib/auth/http';
import { guardAdminWrite } from '@/lib/admin/guard';
import { sanitizePlainText, uniqueContentSlug } from '@/lib/content/admin-write';
import { canManageGalleryCategories } from '@/lib/gallery/access';
import { formatZodErrors, galleryCategoryWriteSchema } from '@/lib/gallery/validation';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await guardAdminWrite(request, 'gallery', 'update');
  if (!auth.ok) return auth.error;
  if (!canManageGalleryCategories(auth.user)) {
    return error('You cannot manage gallery categories.', 403);
  }
  const { id } = await context.params;
  const existing = await db.galleryCategory.findUnique({ where: { id } });
  if (!existing) return notFound('Category');
  const parsed = galleryCategoryWriteSchema.partial().safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));
  const slug =
    parsed.data.name || parsed.data.slug
      ? await uniqueContentSlug('galleryCategory', parsed.data.name ?? existing.name, parsed.data.slug, id)
      : existing.slug;
  const row = await db.galleryCategory.update({
    where: { id },
    data: {
      name: parsed.data.name ? sanitizePlainText(parsed.data.name, 80) : existing.name,
      slug,
      description:
        parsed.data.description === undefined
          ? existing.description
          : parsed.data.description
            ? sanitizePlainText(parsed.data.description, 400)
            : null,
      sortOrder: parsed.data.sortOrder ?? existing.sortOrder,
    },
  });
  return success(row, 'Category updated.');
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await guardAdminWrite(request, 'gallery', 'delete');
  if (!auth.ok) return auth.error;
  if (!canManageGalleryCategories(auth.user)) {
    return error('You cannot manage gallery categories.', 403);
  }
  const { id } = await context.params;
  const existing = await db.galleryCategory.findUnique({
    where: { id },
    include: { _count: { select: { albums: true } } },
  });
  if (!existing) return notFound('Category');
  if (existing._count.albums > 0) {
    return error('Remove this category from albums before deleting it.', 409);
  }
  await db.galleryCategory.delete({ where: { id } });
  return success({ id }, 'Category deleted.');
}
