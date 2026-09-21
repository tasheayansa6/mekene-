import { db } from '@/lib/db';
import { success } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';
import { serializeContributionSelf } from '@/lib/giving/serialize';
import { contributionInclude } from '@/lib/giving/write';
import { Decimal } from '@prisma/client/runtime/library';
import { netContributionAmount, moneyToString } from '@/lib/giving/money';

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get('page') || 1));
  const pageSize = Math.min(50, Math.max(1, Number(url.searchParams.get('pageSize') || 20)));

  const where = { userId: auth.user.id };
  const [totalItems, rows, successful] = await Promise.all([
    db.contribution.count({ where }),
    db.contribution.findMany({
      where,
      include: contributionInclude,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.contribution.findMany({
      where: {
        userId: auth.user.id,
        status: { in: ['successful', 'partially_refunded'] },
      },
      select: { amount: true, refundedAmount: true, currency: true },
    }),
  ]);

  const total = successful.reduce(
    (sum, row) => sum.plus(netContributionAmount(row.amount, row.refundedAmount)),
    new Decimal(0)
  );

  return success({
    summary: {
      totalSuccessful: moneyToString(total),
      currency: 'ETB',
      count: successful.length,
    },
    contributions: rows.map(serializeContributionSelf),
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
    },
  });
}
