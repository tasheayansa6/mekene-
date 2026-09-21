import { db } from '@/lib/db';
import { error, success, validationError } from '@/lib/api/response';
import { readJson } from '@/lib/auth/http';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { logContentChange, sanitizePlainText, uniqueContentSlug } from '@/lib/content/admin-write';
import { eventCategoryWriteSchema, formatZodErrors } from '@/lib/events/validation';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'events', 'view');
  if (!auth.ok) return auth.error;
  const rows = await db.eventCategory.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { events: true } } },
  });
  return success(
    rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      sortOrder: row.sortOrder,
      usage: row._count.events,
    }))
  );
}

export async function POST(request: Request) {
  const auth = await guardAdminWrite(request, 'events', 'create');
  if (!auth.ok) return auth.error;
  const parsed = eventCategoryWriteSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));
  const slug = await uniqueContentSlug('eventCategory', parsed.data.name, parsed.data.slug);
  const existing = await db.eventCategory.findUnique({ where: { slug } });
  if (existing) return error('A category with this slug already exists.', 409);
  const row = await db.eventCategory.create({
    data: {
      name: sanitizePlainText(parsed.data.name, 80),
      slug,
      description: parsed.data.description ? sanitizePlainText(parsed.data.description, 400) : null,
      sortOrder: parsed.data.sortOrder ?? 0,
    },
  });
  await logContentChange({
    type: 'category.created',
    entity: 'event_category',
    entityId: row.id,
    userId: auth.user.id,
    request,
    details: { name: row.name },
  });
  return success(row, 'Category created.', 201);
}
