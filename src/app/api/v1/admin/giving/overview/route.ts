import { Decimal } from '@prisma/client/runtime/library';
import { db } from '@/lib/db';
import { forbidden, success } from '@/lib/api/response';
import { guardAdminRead } from '@/lib/admin/guard';
import { canViewGiving } from '@/lib/giving/access';
import { moneyToString, netContributionAmount } from '@/lib/giving/money';
import { serializeContribution } from '@/lib/giving/serialize';
import { contributionInclude } from '@/lib/giving/write';
import { getConfiguredProviderId, getPaymentProvider } from '@/lib/giving/providers';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'giving', 'view');
  if (!auth.ok) return auth.error;
  if (!canViewGiving(auth.user)) return forbidden();

  const [successful, pending, failed, refunded, recent] = await Promise.all([
    db.contribution.findMany({
      where: { status: { in: ['successful', 'partially_refunded'] } },
      select: { amount: true, refundedAmount: true },
    }),
    db.contribution.count({ where: { status: { in: ['pending', 'processing'] } } }),
    db.contribution.count({ where: { status: 'failed' } }),
    db.contribution.count({
      where: { status: { in: ['refunded', 'partially_refunded'] } },
    }),
    db.contribution.findMany({
      include: contributionInclude,
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ]);

  const total = successful.reduce(
    (sum, row) => sum.plus(netContributionAmount(row.amount, row.refundedAmount)),
    new Decimal(0)
  );

  const byCategory = await db.contribution.groupBy({
    by: ['categoryId'],
    where: { status: { in: ['successful', 'partially_refunded'] } },
    _count: { _all: true },
  });

  const categories = await db.donationCategory.findMany({
    where: { id: { in: byCategory.map((row) => row.categoryId) } },
    select: { id: true, name: true, slug: true },
  });

  const provider = getPaymentProvider();

  return success({
    metrics: {
      totalSuccessful: moneyToString(total),
      currency: 'ETB',
      successfulCount: successful.length,
      pendingCount: pending,
      failedCount: failed,
      refundCount: refunded,
    },
    byCategory: byCategory.map((row) => ({
      categoryId: row.categoryId,
      name: categories.find((c) => c.id === row.categoryId)?.name || row.categoryId,
      count: row._count._all,
    })),
    recent: recent.map((row) => serializeContribution(row)),
    provider: {
      id: getConfiguredProviderId(),
      displayName: provider.displayName,
      onlineCheckoutAvailable: provider.supportsOnlineCheckout,
    },
  });
}
