import { db } from '@/lib/db';
import { error, forbidden, success, validationError } from '@/lib/api/response';
import { readJson } from '@/lib/auth/http';
import { sanitizePlainText } from '@/lib/content/sanitize';
import { uniqueContentSlug } from '@/lib/content/admin-write';
import { guardPrayerAdminRead, guardPrayerAdminWrite } from '@/lib/prayer/guard';
import { canManagePrayerCategories } from '@/lib/prayer/access';
import { formatZodErrors, prayerCategoryWriteSchema } from '@/lib/prayer/validation';

export async function GET(request: Request) {
  const auth = await guardPrayerAdminRead(request, 'view');
  if (!auth.ok) return auth.error;
  const rows = await db.prayerCategory.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { requests: true } } },
  });
  return success(
    rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      sortOrder: row.sortOrder,
      usage: row._count.requests,
    }))
  );
}

export async function POST(request: Request) {
  const auth = await guardPrayerAdminWrite(request, 'moderate');
  if (!auth.ok) return auth.error;
  if (!canManagePrayerCategories(auth.user)) return forbidden();

  const parsed = prayerCategoryWriteSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));
  const slug = await uniqueContentSlug('prayerCategory', parsed.data.name, parsed.data.slug);
  const existing = await db.prayerCategory.findUnique({ where: { slug } });
  if (existing) return error('A category with this slug already exists.', 409);
  const row = await db.prayerCategory.create({
    data: {
      name: sanitizePlainText(parsed.data.name, 80),
      slug,
      description: parsed.data.description ? sanitizePlainText(parsed.data.description, 400) : null,
      sortOrder: parsed.data.sortOrder ?? 0,
    },
  });
  return success(row, 'Category created.', 201);
}
