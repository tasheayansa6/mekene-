import { db } from '@/lib/db';
import { error, success, validationError } from '@/lib/api/response';
import { readJson } from '@/lib/auth/http';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { logContentChange, sanitizePlainText, uniqueContentSlug } from '@/lib/content/admin-write';
import { categoryWriteSchema, formatZodErrors } from '@/lib/content/validation';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'content', 'view');
  if (!auth.ok) return auth.error;
  const url = new URL(request.url);
  const scope = url.searchParams.get('scope');
  const rows = await db.contentCategory.findMany({
    where: scope === 'news' || scope === 'resource' ? { scope } : undefined,
    orderBy: [{ scope: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { newsArticles: true, resources: true } } },
  });
  return success(
    rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      scope: row.scope,
      sortOrder: row.sortOrder,
      usage: row._count.newsArticles + row._count.resources,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }))
  );
}

export async function POST(request: Request) {
  const auth = await guardAdminWrite(request, 'content', 'create');
  if (!auth.ok) return auth.error;
  const parsed = categoryWriteSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));
  const data = parsed.data;
  const slug = await uniqueContentSlug('contentCategory', data.name, data.slug);
  const existing = await db.contentCategory.findUnique({
    where: { scope_slug: { scope: data.scope, slug } },
  });
  if (existing) return error('A category with this slug already exists in this group.', 409);
  const row = await db.contentCategory.create({
    data: {
      name: sanitizePlainText(data.name, 80),
      slug,
      description: data.description ? sanitizePlainText(data.description, 400) : null,
      scope: data.scope,
      sortOrder: data.sortOrder ?? 0,
    },
  });
  await logContentChange({
    type: 'category.created',
    entity: 'content_category',
    entityId: row.id,
    userId: auth.user.id,
    request,
    details: { name: row.name, scope: row.scope },
  });
  return success(row, 'Category created.', 201);
}
