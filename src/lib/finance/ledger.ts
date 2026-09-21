import { Decimal } from '@prisma/client/runtime/library';
import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { moneyToString } from '@/lib/giving/money';

type Tx = Prisma.TransactionClient;

/** Pure check used by postIncomeFromContribution and unit tests. */
export function hasPostedIncomeForContribution(
  entries: Array<{ type: string; status: string; contributionId: string | null }>
): boolean {
  return entries.some(
    (entry) =>
      entry.type === 'income' &&
      entry.status === 'posted' &&
      entry.contributionId != null
  );
}

export async function nextLedgerReference(tx: Tx | typeof db = db): Promise<string> {
  const latest = await tx.financialEntry.findFirst({
    where: { reference: { startsWith: 'BME-LED-' } },
    orderBy: { reference: 'desc' },
    select: { reference: true },
  });
  let next = 1;
  if (latest?.reference) {
    const match = latest.reference.match(/BME-LED-(\d+)/);
    if (match) next = Number(match[1]) + 1;
  }
  return `BME-LED-${String(next).padStart(6, '0')}`;
}

export async function nextExpenseReference(tx: Tx | typeof db = db): Promise<string> {
  const latest = await tx.expense.findFirst({
    where: { reference: { startsWith: 'BME-EXP-' } },
    orderBy: { reference: 'desc' },
    select: { reference: true },
  });
  let next = 1;
  if (latest?.reference) {
    const match = latest.reference.match(/BME-EXP-(\d+)/);
    if (match) next = Number(match[1]) + 1;
  }
  return `BME-EXP-${String(next).padStart(6, '0')}`;
}

export async function postIncomeFromContribution(
  contribution: {
    id: string;
    amount: Decimal | string | number;
    currency: string;
    categoryId: string;
    completedAt?: Date | null;
    createdAt?: Date;
    reference?: string;
  },
  options?: { createdById?: string | null; tx?: Tx }
) {
  const client = options?.tx || db;

  const existing = await client.financialEntry.findFirst({
    where: {
      contributionId: contribution.id,
      type: 'income',
      status: 'posted',
    },
  });
  if (existing) {
    return { ok: true as const, skipped: true as const, entry: existing };
  }

  const reference = await nextLedgerReference(client);
  const entry = await client.financialEntry.create({
    data: {
      type: 'income',
      status: 'posted',
      reference,
      amount: new Decimal(contribution.amount),
      currency: contribution.currency || 'ETB',
      entryDate: contribution.completedAt || contribution.createdAt || new Date(),
      fundId: contribution.categoryId,
      contributionId: contribution.id,
      description: contribution.reference
        ? `Income from contribution ${contribution.reference}`
        : 'Income from contribution',
      createdById: options?.createdById || null,
    },
  });

  return { ok: true as const, skipped: false as const, entry };
}

export async function postRefundAdjustment(input: {
  contributionId: string;
  amount: Decimal | string | number;
  currency?: string;
  fundId?: string | null;
  description?: string;
  createdById?: string | null;
  entryDate?: Date;
  tx?: Tx;
}) {
  const client = input.tx || db;
  const reference = await nextLedgerReference(client);
  const entry = await client.financialEntry.create({
    data: {
      type: 'refund',
      status: 'posted',
      reference,
      amount: new Decimal(input.amount),
      currency: input.currency || 'ETB',
      entryDate: input.entryDate || new Date(),
      fundId: input.fundId || null,
      contributionId: input.contributionId,
      description: input.description || 'Refund adjustment',
      createdById: input.createdById || null,
    },
  });
  return { ok: true as const, entry };
}

export async function postExpensePaid(
  expense: {
    id: string;
    amount: Decimal | string | number;
    currency: string;
    fundId?: string | null;
    reference?: string;
    paidAt?: Date | null;
    expenseDate?: Date;
  },
  options?: { createdById?: string | null; tx?: Tx }
) {
  const client = options?.tx || db;

  const existing = await client.financialEntry.findFirst({
    where: {
      expenseId: expense.id,
      type: 'expense',
      status: 'posted',
    },
  });
  if (existing) {
    return { ok: true as const, skipped: true as const, entry: existing };
  }

  const reference = await nextLedgerReference(client);
  const entry = await client.financialEntry.create({
    data: {
      type: 'expense',
      status: 'posted',
      reference,
      amount: new Decimal(expense.amount),
      currency: expense.currency || 'ETB',
      entryDate: expense.paidAt || expense.expenseDate || new Date(),
      fundId: expense.fundId || null,
      expenseId: expense.id,
      description: expense.reference
        ? `Expense paid ${expense.reference}`
        : 'Expense paid',
      createdById: options?.createdById || null,
    },
  });

  return { ok: true as const, skipped: false as const, entry };
}

export async function voidEntry(
  entryId: string,
  options?: { createdById?: string | null }
) {
  const existing = await db.financialEntry.findUnique({ where: { id: entryId } });
  if (!existing) return { ok: false as const, error: 'Ledger entry not found.' };
  if (existing.status === 'voided') {
    return { ok: true as const, skipped: true as const, entry: existing };
  }

  const entry = await db.financialEntry.update({
    where: { id: entryId },
    data: { status: 'voided' },
  });

  return { ok: true as const, skipped: false as const, entry };
}

export function ledgerAmountLabel(type: string, amount: Decimal | string): string {
  const value = moneyToString(amount);
  if (type === 'income') return `+${value}`;
  if (type === 'refund' || type === 'expense') return `-${value}`;
  return value;
}
