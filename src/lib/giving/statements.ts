import { Decimal } from '@prisma/client/runtime/library';
import { db } from '@/lib/db';
import { moneyToString, netContributionAmount } from './money';
import { getGivingSettings, givingYearBounds } from './currency';
import { contributionInclude } from './write';
import { serializeContributionSelf } from './serialize';

export async function buildMemberGivingStatement(input: {
  userId: string;
  yearLabel?: string | null;
}) {
  const settings = await getGivingSettings();
  const bounds = givingYearBounds(settings.givingYearStartMonth);
  let start = bounds.start;
  let end = bounds.end;
  let label = bounds.label;
  if (input.yearLabel && /^\d{4}$/.test(input.yearLabel) && settings.givingYearStartMonth === 1) {
    const y = Number(input.yearLabel);
    start = new Date(Date.UTC(y, 0, 1));
    end = new Date(Date.UTC(y, 11, 31, 23, 59, 59, 999));
    label = String(y);
  }

  const rows = await db.contribution.findMany({
    where: {
      userId: input.userId,
      status: { in: ['successful', 'partially_refunded'] },
      completedAt: { gte: start, lte: end },
    },
    include: contributionInclude,
    orderBy: { completedAt: 'asc' },
  });

  const totalsAcc: Record<string, Decimal> = {};
  const items = rows.map((row) => {
    const net = netContributionAmount(row.amount, row.refundedAmount);
    totalsAcc[row.currency] = (totalsAcc[row.currency] || new Decimal(0)).plus(net);
    return serializeContributionSelf(row);
  });

  const totals: Record<string, string> = {};
  for (const [currency, amount] of Object.entries(totalsAcc)) {
    totals[currency] = moneyToString(amount);
  }

  return {
    period: {
      label,
      start: start.toISOString(),
      end: end.toISOString(),
      givingYearStartMonth: settings.givingYearStartMonth,
    },
    church: {
      legalName: settings.legalChurchName,
      registrationInfo: settings.registrationInfo,
    },
    totals,
    count: items.length,
    contributions: items,
    note: 'This statement lists only your confirmed gifts. Card numbers and banking credentials are never stored.',
  };
}
