import { db } from '@/lib/db';
import { error, forbidden, success, validationError } from '@/lib/api/response';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { readJson } from '@/lib/auth/http';
import { canManageCategories, canViewPastoral } from '@/lib/pastoral/access';
import { formatZodErrors, pastoralCategoryWriteSchema } from '@/lib/pastoral/validation';
import { sanitizePlainText } from '@/lib/content/sanitize';
import { slugify, uniqueSlug } from '@/lib/admin/slug';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'pastoral', 'view');
  if (!auth.ok) return auth.error;
  if (!canViewPastoral(auth.user)) return forbidden();

  const rows = await db.pastoralCareCategory.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { cases: true } } },
  });

  return success(
    rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      sortOrder: row.sortOrder,
      isActive: row.isActive,
      usage: row._count.cases,
    }))
  );
}

export async function POST(request: Request) {
  const auth = await guardAdminWrite(request, 'pastoral', 'manage');
  if (!auth.ok) return auth.error;
  if (!canManageCategories(auth.user)) return forbidden();

  const parsed = pastoralCategoryWriteSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const slug = await uniqueSlug(parsed.data.slug || parsed.data.name, async (candidate) => {
    const row = await db.pastoralCareCategory.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    return Boolean(row);
  });

  const existing = await db.pastoralCareCategory.findUnique({ where: { slug } });
  if (existing) return error('A category with this slug already exists.', 409);

  const row = await db.pastoralCareCategory.create({
    data: {
      name: sanitizePlainText(parsed.data.name, 80),
      slug: slug || slugify(parsed.data.name),
      description: parsed.data.description
        ? sanitizePlainText(parsed.data.description, 400)
        : null,
      sortOrder: parsed.data.sortOrder ?? 0,
      isActive: parsed.data.isActive ?? true,
    },
  });

  return success(row, 'Category created.', 201);
}
