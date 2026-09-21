import { db } from '@/lib/db';
import { success } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';
import { serializeContributionSelf } from '@/lib/giving/serialize';
import { contributionInclude } from '@/lib/giving/write';

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const rows = await db.contribution.findMany({
    where: {
      userId: auth.user.id,
      status: { in: ['successful', 'partially_refunded'] },
    },
    include: contributionInclude,
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return success({
    receipts: rows.map((row) => ({
      ...serializeContributionSelf(row),
      href: `/give/receipt/${row.reference}`,
    })),
  });
}
