import { db } from '@/lib/db';
import { paginated, validationError } from '@/lib/api/response';
import { enforceAdminRateLimit } from '@/lib/admin/guard';
import { guardPrayerAdminRead } from '@/lib/prayer/guard';
import { adminPrayerListSchema, formatZodErrors } from '@/lib/prayer/validation';
import { canModeratePrayer } from '@/lib/prayer/access';
import { serializeAdminListRow } from '@/lib/prayer/serialize';

export async function GET(request: Request) {
  const auth = await guardPrayerAdminRead(request, 'view');
  if (!auth.ok) return auth.error;
  const limited = enforceAdminRateLimit(request, auth.user.id, 'prayer-list');
  if (limited) return limited;

  const url = new URL(request.url);
  const parsed = adminPrayerListSchema.safeParse({
    q: url.searchParams.get('q') || undefined,
    page: url.searchParams.get('page') || 1,
    pageSize: url.searchParams.get('pageSize') || 20,
    status: url.searchParams.get('status') || undefined,
    category: url.searchParams.get('category') || undefined,
    visibility: url.searchParams.get('visibility') || undefined,
    assignedTo: url.searchParams.get('assignedTo') || undefined,
    from: url.searchParams.get('from') || undefined,
    to: url.searchParams.get('to') || undefined,
    sort: url.searchParams.get('sort') || undefined,
    dir: url.searchParams.get('dir') || undefined,
  });
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const { q, page, pageSize, status, category, visibility, assignedTo, from, to, sort, dir } =
    parsed.data;
  const and: object[] = [];
  if (q) {
    const or: object[] = [{ title: { contains: q } }, { category: { name: { contains: q } } }];
    if (canModeratePrayer(auth.user)) {
      or.push({ content: { contains: q } });
    }
    and.push({ OR: or });
  }
  if (status) and.push({ status });
  if (category) and.push({ categoryId: category });
  if (visibility) and.push({ visibility });
  if (assignedTo === 'unassigned') and.push({ assignedToId: null });
  else if (assignedTo) and.push({ assignedToId: assignedTo });
  if (from) {
    const date = new Date(from);
    if (!Number.isNaN(date.getTime())) and.push({ createdAt: { gte: date } });
  }
  if (to) {
    const date = new Date(to);
    if (!Number.isNaN(date.getTime())) and.push({ createdAt: { lte: date } });
  }

  const where = and.length ? { AND: and } : {};
  const orderField = ['title', 'status', 'updatedAt', 'createdAt'].includes(sort || '')
    ? sort!
    : 'updatedAt';

  const [totalItems, rows] = await Promise.all([
    db.prayerRequest.count({ where }),
    db.prayerRequest.findMany({
      where,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { [orderField]: dir === 'asc' ? 'asc' : 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return paginated(
    rows.map(serializeAdminListRow),
    { page, pageSize, totalItems }
  );
}
