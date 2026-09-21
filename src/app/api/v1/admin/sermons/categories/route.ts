import { db } from '@/lib/db';
import { error, success, validationError } from '@/lib/api/response';
import { readJson } from '@/lib/auth/http';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { logContentChange, sanitizePlainText, uniqueContentSlug } from '@/lib/content/admin-write';
import { formatZodErrors, sermonCategoryWriteSchema } from '@/lib/sermons/validation';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'sermons', 'view');
  if (!auth.ok) return auth.error;
  const rows = await db.sermonCategory.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { sermons: true } } },
  });
  return success(
    rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      sortOrder: row.sortOrder,
      usage: row._count.sermons,
    }))
  );
}

export async function POST(request: Request) {
  const auth = await guardAdminWrite(request, 'sermons', 'create');
  if (!auth.ok) return auth.error;
  const parsed = sermonCategoryWriteSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));
  const slug = await uniqueContentSlug('sermonCategory', parsed.data.name, parsed.data.slug);
  const existing = await db.sermonCategory.findUnique({ where: { slug } });
  if (existing) return error('A category with this slug already exists.', 409);
  const row = await db.sermonCategory.create({
    data: {
      name: sanitizePlainText(parsed.data.name, 80),
      slug,
      description: parsed.data.description ? sanitizePlainText(parsed.data.description, 400) : null,
      sortOrder: parsed.data.sortOrder ?? 0,
    },
  });
  await logContentChange({
    type: 'category.created',
    entity: 'sermon_category',
    entityId: row.id,
    userId: auth.user.id,
    request,
    details: { name: row.name },
  });
  return success(row, 'Category created.', 201);
}
