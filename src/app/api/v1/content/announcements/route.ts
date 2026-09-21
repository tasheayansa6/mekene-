import { db } from '@/lib/db';
import { paginated, validationError } from '@/lib/api/response';
import { authorSelect, promoteScheduledContent, serializeAuthor } from '@/lib/content/query';
import { publicStatusWhere } from '@/lib/content/status';
import { contentListSchema, formatZodErrors } from '@/lib/content/validation';

export async function GET(request: Request) {
  await promoteScheduledContent();
  const url = new URL(request.url);
  const parsed = contentListSchema.safeParse({
    q: url.searchParams.get('q') || undefined,
    page: url.searchParams.get('page') || 1,
    pageSize: url.searchParams.get('pageSize') || 20,
    featured: url.searchParams.get('featured') || undefined,
  });
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const now = new Date();
  const { q, page, pageSize, featured } = parsed.data;
  const where: Record<string, unknown> = {
    AND: [
      publicStatusWhere(now),
      { startAt: { lte: now } },
      { OR: [{ endAt: null }, { endAt: { gt: now } }] },
    ],
  };
  if (q) {
    (where.AND as object[]).push({
      OR: [{ title: { contains: q } }, { excerpt: { contains: q } }],
    });
  }
  if (featured === 'true') (where.AND as object[]).push({ isFeatured: true });

  const [totalItems, rows] = await Promise.all([
    db.announcement.count({ where }),
    db.announcement.findMany({
      where,
      include: { author: { select: authorSelect } },
      orderBy: [{ isFeatured: 'desc' }, { priority: 'desc' }, { startAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return paginated(
    rows.map((row) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      excerpt: row.excerpt,
      content: row.content,
      priority: row.priority,
      isFeatured: row.isFeatured,
      startAt: row.startAt.toISOString(),
      endAt: row.endAt?.toISOString() ?? null,
      featuredImageUrl: row.featuredImageUrl,
      author: serializeAuthor(row.author),
    })),
    { page, pageSize, totalItems }
  );
}
