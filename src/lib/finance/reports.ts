import { Decimal } from '@prisma/client/runtime/library';
import { moneyToString } from '@/lib/giving/money';

/** Pure budget remaining helper (allocated − spent). May be negative when overspent. */
export function computeBudgetRemaining(
  allocated: Decimal | string | number,
  spent: Decimal | string | number
): Decimal {
  return new Decimal(allocated).minus(new Decimal(spent)).toDecimalPlaces(2);
}

export type FundAggregate = {
  fundId: string | null;
  fundName: string | null;
  income: string;
  expense: string;
  refund: string;
  net: string;
};

export type FinanceReportSummary = {
  from: string | null;
  to: string | null;
  currency: string;
  income: string;
  expense: string;
  refund: string;
  net: string;
  byFund: FundAggregate[];
};

/**
 * Aggregate posted FinancialEntry rows only (income / expense / refund).
 * Adjustments are included in net as signed amount by type.
 */
export function aggregatePostedEntries(
  rows: Array<{
    type: string;
    amount: Decimal | string | number;
    fundId: string | null;
    fund?: { id: string; name: string } | null;
  }>,
  range?: { from?: Date | null; to?: Date | null }
): FinanceReportSummary {
  let income = new Decimal(0);
  let expense = new Decimal(0);
  let refund = new Decimal(0);
  const byFundMap = new Map<
    string,
    { fundId: string | null; fundName: string | null; income: Decimal; expense: Decimal; refund: Decimal }
  >();

  for (const row of rows) {
    const amount = new Decimal(row.amount);
    const key = row.fundId || '__unassigned__';
    if (!byFundMap.has(key)) {
      byFundMap.set(key, {
        fundId: row.fundId,
        fundName: row.fund?.name ?? null,
        income: new Decimal(0),
        expense: new Decimal(0),
        refund: new Decimal(0),
      });
    }
    const bucket = byFundMap.get(key)!;
    if (row.type === 'income') {
      income = income.plus(amount);
      bucket.income = bucket.income.plus(amount);
    } else if (row.type === 'expense') {
      expense = expense.plus(amount);
      bucket.expense = bucket.expense.plus(amount);
    } else if (row.type === 'refund') {
      refund = refund.plus(amount);
      bucket.refund = bucket.refund.plus(amount);
    } else if (row.type === 'adjustment') {
      // Adjustments reduce net (treated like expense-side correction unless negative)
      expense = expense.plus(amount);
      bucket.expense = bucket.expense.plus(amount);
    }
  }

  const net = income.minus(expense).minus(refund);

  return {
    from: range?.from?.toISOString() ?? null,
    to: range?.to?.toISOString() ?? null,
    currency: 'ETB',
    income: moneyToString(income),
    expense: moneyToString(expense),
    refund: moneyToString(refund),
    net: moneyToString(net),
    byFund: Array.from(byFundMap.values()).map((bucket) => ({
      fundId: bucket.fundId,
      fundName: bucket.fundName,
      income: moneyToString(bucket.income),
      expense: moneyToString(bucket.expense),
      refund: moneyToString(bucket.refund),
      net: moneyToString(bucket.income.minus(bucket.expense).minus(bucket.refund)),
    })),
  };
}

export async function buildFinanceReport(input: {
  from?: Date | null;
  to?: Date | null;
  fundId?: string | null;
}): Promise<FinanceReportSummary> {
  const { db } = await import('@/lib/db');
  const and: Array<Record<string, unknown>> = [{ status: 'posted' }];
  if (input.from) and.push({ entryDate: { gte: input.from } });
  if (input.to) and.push({ entryDate: { lte: input.to } });
  if (input.fundId) and.push({ fundId: input.fundId });

  const rows = await db.financialEntry.findMany({
    where: { AND: and },
    select: {
      type: true,
      amount: true,
      fundId: true,
      fund: { select: { id: true, name: true } },
    },
  });

  return aggregatePostedEntries(rows, { from: input.from, to: input.to });
}

export async function spentAgainstBudget(input: {
  fundId?: string | null;
  expenseCategoryId?: string | null;
  periodStart: Date;
  periodEnd: Date;
}): Promise<Decimal> {
  const { db } = await import('@/lib/db');
  const and: Array<Record<string, unknown>> = [
    { status: 'posted' },
    { type: 'expense' },
    { entryDate: { gte: input.periodStart, lte: input.periodEnd } },
  ];
  if (input.fundId) and.push({ fundId: input.fundId });
  if (input.expenseCategoryId) {
    and.push({ expense: { categoryId: input.expenseCategoryId } });
  }

  const rows = await db.financialEntry.findMany({
    where: { AND: and },
    select: { amount: true },
  });

  return rows.reduce((sum, row) => sum.plus(row.amount), new Decimal(0));
}
