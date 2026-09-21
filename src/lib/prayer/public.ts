import { db } from '@/lib/db';
import { isPubliclyListable } from './status';
import { serializePublicPrayer } from './serialize';

export const publicPrayerWhere = {
  visibility: 'public' as const,
  publicApproved: true,
  status: { notIn: ['rejected', 'archived'] as const },
};

export async function getPublicPrayerList(options: {
  q?: string;
  category?: string;
  page: number;
  pageSize: number;
}) {
  const and: object[] = [{ ...publicPrayerWhere }];
  if (options.category) and.push({ category: { slug: options.category } });
  if (options.q) {
    and.push({
      OR: [{ title: { contains: options.q } }, { category: { name: { contains: options.q } } }],
    });
  }
  const where = { AND: and };
  const [totalItems, rows] = await Promise.all([
    db.prayerRequest.count({ where }),
    db.prayerRequest.findMany({
      where,
      include: { category: { select: { id: true, name: true, slug: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (options.page - 1) * options.pageSize,
      take: options.pageSize,
    }),
  ]);
  return {
    items: rows.filter(isPubliclyListable).map(serializePublicPrayer),
    page: options.page,
    pageSize: options.pageSize,
    totalItems,
  };
}

export async function getPublicPrayerById(id: string) {
  const row = await db.prayerRequest.findUnique({
    where: { id },
    include: { category: { select: { id: true, name: true, slug: true } } },
  });
  if (!row || !isPubliclyListable(row)) return null;
  return serializePublicPrayer(row);
}

export async function prayerPublicIndexEnabled(): Promise<boolean> {
  const { getSystemSettings } = await import('@/lib/admin/settings');
  const settings = await getSystemSettings();
  return settings.prayerPublicIndex === true;
}
