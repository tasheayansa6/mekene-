import { db } from '@/lib/db';
import { success, validationError } from '@/lib/api/response';
import { readJson } from '@/lib/auth/http';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import {
  logContentChange,
  parseDate,
  revalidatePublicContent,
  sanitizeMarkdown,
  sanitizeOptionalUrl,
  sanitizePlainText,
  uniqueContentSlug,
  unsafeUrlError,
} from '@/lib/content/admin-write';
import { resolveSermonWrite } from '@/lib/sermons/access';
import { formatZodErrors, seriesWriteSchema } from '@/lib/sermons/validation';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'sermons', 'view');
  if (!auth.ok) return auth.error;
  const rows = await db.sermonSeries.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { sermons: true } } },
  });
  return success(
    rows.map((row) => ({
      ...row,
      sermonCount: row._count.sermons,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      publishedAt: row.publishedAt?.toISOString() ?? null,
      publishAt: row.publishAt?.toISOString() ?? null,
    }))
  );
}

export async function POST(request: Request) {
  const auth = await guardAdminWrite(request, 'sermons', 'create');
  if (!auth.ok) return auth.error;
  const parsed = seriesWriteSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));
  try {
    sanitizeOptionalUrl(parsed.data.imageUrl);
  } catch {
    return unsafeUrlError();
  }
  const slug = await uniqueContentSlug('sermonSeries', parsed.data.name, parsed.data.slug);
  const publishAt = parseDate(parsed.data.publishAt);
  const resolved = resolveSermonWrite(auth.user, { status: parsed.data.status, publishAt });
  const row = await db.sermonSeries.create({
    data: {
      name: sanitizePlainText(parsed.data.name, 120),
      slug,
      description: parsed.data.description ? sanitizeMarkdown(parsed.data.description, 4000) : null,
      imageUrl: sanitizeOptionalUrl(parsed.data.imageUrl),
      imageAlt: parsed.data.imageAlt ? sanitizePlainText(parsed.data.imageAlt, 180) : null,
      status: resolved.status,
      seoTitle: parsed.data.seoTitle ? sanitizePlainText(parsed.data.seoTitle, 70) : null,
      seoDescription: parsed.data.seoDescription ? sanitizePlainText(parsed.data.seoDescription, 160) : null,
      publishAt,
      publishedAt: resolved.publishedAt,
    },
  });
  await logContentChange({
    type: 'sermon.created',
    entity: 'sermon_series',
    entityId: row.id,
    userId: auth.user.id,
    request,
    details: { slug: row.slug },
  });
  revalidatePublicContent([`/sermons/series/${row.slug}`]);
  return success(row, 'Series created.', 201);
}
