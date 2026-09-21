import { db } from '@/lib/db';
import { error, forbidden, notFound, success, validationError } from '@/lib/api/response';
import { readJson } from '@/lib/auth/http';
import { sanitizePlainText } from '@/lib/content/sanitize';
import { uniqueContentSlug } from '@/lib/content/admin-write';
import { guardPrayerAdminWrite } from '@/lib/prayer/guard';
import { canManagePrayerCategories } from '@/lib/prayer/access';
import { formatZodErrors, prayerCategoryWriteSchema } from '@/lib/prayer/validation';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await guardPrayerAdminWrite(request, 'moderate');
  if (!auth.ok) return auth.error;
  if (!canManagePrayerCategories(auth.user)) return forbidden();

  const parsed = prayerCategoryWriteSchema.partial().safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));
  const { id } = await context.params;
  const existing = await db.prayerCategory.findUnique({ where: { id } });
  if (!existing) return notFound('Category');

  const slug = parsed.data.name
    ? await uniqueContentSlug('prayerCategory', parsed.data.name, parsed.data.slug, id)
    : existing.slug;

  const row = await db.prayerCategory.update({
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
  return success(row, 'Category updated.');
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await guardPrayerAdminWrite(request, 'moderate');
  if (!auth.ok) return auth.error;
  if (!canManagePrayerCategories(auth.user)) return forbidden();

  const { id } = await context.params;
  const existing = await db.prayerCategory.findUnique({
    where: { id },
    include: { _count: { select: { requests: true } } },
  });
  if (!existing) return notFound('Category');
  if (existing._count.requests > 0) {
    return error('This category is in use. Reassign requests before removing it.', 409);
  }
  await db.prayerCategory.delete({ where: { id } });
  return success({ id }, 'Category removed.');
}
