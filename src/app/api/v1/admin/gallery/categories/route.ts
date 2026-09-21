import { db } from '@/lib/db';
import { error, success, validationError } from '@/lib/api/response';
import { readJson } from '@/lib/auth/http';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { logContentChange, sanitizePlainText, uniqueContentSlug } from '@/lib/content/admin-write';
import { canManageGalleryCategories } from '@/lib/gallery/access';
import { formatZodErrors, galleryCategoryWriteSchema } from '@/lib/gallery/validation';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'gallery', 'view');
  if (!auth.ok) return auth.error;
  const rows = await db.galleryCategory.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { albums: true } } },
  });
  return success(
    rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      sortOrder: row.sortOrder,
      usage: row._count.albums,
    }))
  );
}

export async function POST(request: Request) {
  const auth = await guardAdminWrite(request, 'gallery', 'create');
  if (!auth.ok) return auth.error;
  if (!canManageGalleryCategories(auth.user)) {
    return error('You cannot manage gallery categories.', 403);
  }
  const parsed = galleryCategoryWriteSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));
  const slug = await uniqueContentSlug('galleryCategory', parsed.data.name, parsed.data.slug);
  const existing = await db.galleryCategory.findUnique({ where: { slug } });
  if (existing) return error('A category with this slug already exists.', 409);
  const row = await db.galleryCategory.create({
    data: {
      name: sanitizePlainText(parsed.data.name, 80),
      slug,
      description: parsed.data.description ? sanitizePlainText(parsed.data.description, 400) : null,
      sortOrder: parsed.data.sortOrder ?? 0,
    },
  });
  await logContentChange({
    type: 'category.created',
    entity: 'gallery_category',
    entityId: row.id,
    userId: auth.user.id,
    request,
    details: { name: row.name },
  });
  return success(row, 'Category created.', 201);
}
