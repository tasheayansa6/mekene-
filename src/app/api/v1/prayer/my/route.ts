import { db } from '@/lib/db';
import { paginated } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';
import { paginationSchema } from '@/lib/admin/validation';
import { formatZodErrors } from '@/lib/prayer/validation';
import { validationError } from '@/lib/api/response';
import { serializeMemberPrayer } from '@/lib/prayer/serialize';

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const url = new URL(request.url);
  const parsed = paginationSchema.safeParse({
    q: url.searchParams.get('q') || undefined,
    page: url.searchParams.get('page') || 1,
    pageSize: url.searchParams.get('pageSize') || 20,
  });
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const { q, page, pageSize } = parsed.data;
  const where = {
    userId: auth.user.id,
    ...(q
      ? {
          OR: [{ title: { contains: q } }, { category: { name: { contains: q } } }],
        }
      : {}),
  };

  const [totalItems, rows] = await Promise.all([
    db.prayerRequest.count({ where }),
    db.prayerRequest.findMany({
      where,
      include: { category: { select: { id: true, name: true, slug: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return paginated(
    rows.map((row) => serializeMemberPrayer(row, { includeContent: false })),
    { page, pageSize, totalItems }
  );
}
