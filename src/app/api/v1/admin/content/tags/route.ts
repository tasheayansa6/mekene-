import { db } from '@/lib/db';
import { error, success, validationError } from '@/lib/api/response';
import { readJson } from '@/lib/auth/http';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { logContentChange, sanitizePlainText, uniqueContentSlug } from '@/lib/content/admin-write';
import { formatZodErrors, tagWriteSchema } from '@/lib/content/validation';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'content', 'view');
  if (!auth.ok) return auth.error;
  const rows = await db.contentTag.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { news: true } } },
  });
  return success(
    rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      usage: row._count.news,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }))
  );
}

export async function POST(request: Request) {
  const auth = await guardAdminWrite(request, 'content', 'create');
  if (!auth.ok) return auth.error;
  const parsed = tagWriteSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));
  const slug = await uniqueContentSlug('contentTag', parsed.data.name, parsed.data.slug);
  const existing = await db.contentTag.findUnique({ where: { slug } });
  if (existing) return error('A tag with this slug already exists.', 409);
  const row = await db.contentTag.create({
    data: { name: sanitizePlainText(parsed.data.name, 40), slug },
  });
  await logContentChange({
    type: 'tag.created',
    entity: 'content_tag',
    entityId: row.id,
    userId: auth.user.id,
    request,
    details: { name: row.name },
  });
  return success(row, 'Tag created.', 201);
}
