import { Decimal } from '@prisma/client/runtime/library';
import { moneyToString } from '@/lib/giving/money';
import {
  budgetStatusLabel,
  expenseStatusLabel,
  reconciliationStatusLabel,
} from './status';
import { computeBudgetRemaining } from './reports';

export function serializeExpense(row: {
  id: string;
  reference: string;
  amount: Decimal;
  currency: string;
  vendor: string | null;
  description: string;
  expenseDate: Date;
  status: string;
  rejectionReason: string | null;
  submittedById: string;
  reviewedById: string | null;
  reviewedAt: Date | null;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  category?: { id: string; slug: string; name: string } | null;
  fund?: { id: string; slug: string; name: string } | null;
  submittedBy?: { id: string; firstName: string; lastName: string } | null;
  reviewedBy?: { id: string; firstName: string; lastName: string } | null;
  documents?: Array<{
    id: string;
    title: string;
    fileUrl: string;
    fileName: string | null;
    createdAt: Date;
  }>;
}) {
  return {
    id: row.id,
    reference: row.reference,
    amount: moneyToString(row.amount),
    currency: row.currency,
    vendor: row.vendor,
    description: row.description,
    expenseDate: row.expenseDate.toISOString(),
    status: row.status,
    statusLabel: expenseStatusLabel(row.status),
    rejectionReason: row.rejectionReason,
    category: row.category ?? null,
    fund: row.fund ?? null,
    submittedBy: row.submittedBy
      ? {
          id: row.submittedBy.id,
          name: `${row.submittedBy.firstName} ${row.submittedBy.lastName}`.trim(),
        }
      : { id: row.submittedById },
    reviewedBy: row.reviewedBy
      ? {
          id: row.reviewedBy.id,
          name: `${row.reviewedBy.firstName} ${row.reviewedBy.lastName}`.trim(),
        }
      : null,
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    paidAt: row.paidAt?.toISOString() ?? null,
    documents: (row.documents || []).map((doc) => ({
      id: doc.id,
      title: doc.title,
      fileUrl: doc.fileUrl,
      fileName: doc.fileName,
      createdAt: doc.createdAt.toISOString(),
    })),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function serializeExpenseCategory(row: {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
}) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
  };
}

export function serializeBudget(
  row: {
    id: string;
    name: string;
    period: string;
    periodStart: Date;
    periodEnd: Date;
    allocatedAmount: Decimal;
    currency: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    fund?: { id: string; slug: string; name: string } | null;
    expenseCategory?: { id: string; slug: string; name: string } | null;
    createdBy?: { id: string; firstName: string; lastName: string } | null;
  },
  spent?: Decimal | string | number
) {
  const spentAmount = spent === undefined ? new Decimal(0) : new Decimal(spent);
  const remaining = computeBudgetRemaining(row.allocatedAmount, spentAmount);
  return {
    id: row.id,
    name: row.name,
    period: row.period,
    periodStart: row.periodStart.toISOString(),
    periodEnd: row.periodEnd.toISOString(),
    allocatedAmount: moneyToString(row.allocatedAmount),
    spentAmount: moneyToString(spentAmount),
    remainingAmount: moneyToString(remaining),
    currency: row.currency,
    status: row.status,
    statusLabel: budgetStatusLabel(row.status),
    fund: row.fund ?? null,
    expenseCategory: row.expenseCategory ?? null,
    createdBy: row.createdBy
      ? {
          id: row.createdBy.id,
          name: `${row.createdBy.firstName} ${row.createdBy.lastName}`.trim(),
        }
      : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function serializeReconciliation(row: {
  id: string;
  periodLabel: string;
  source: string;
  statementReference: string | null;
  openingBalance: Decimal;
  closingBalance: Decimal;
  expectedTotal: Decimal;
  actualTotal: Decimal;
  status: string;
  notes: string | null;
  reconciledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  reconciledBy?: { id: string; firstName: string; lastName: string } | null;
  matches?: Array<{
    id: string;
    contributionId: string | null;
    externalReference: string | null;
    amount: Decimal;
    matchedAt: Date;
    note: string | null;
  }>;
}) {
  const variance = new Decimal(row.actualTotal).minus(row.expectedTotal);
  return {
    id: row.id,
    periodLabel: row.periodLabel,
    source: row.source,
    statementReference: row.statementReference,
    openingBalance: moneyToString(row.openingBalance),
    closingBalance: moneyToString(row.closingBalance),
    expectedTotal: moneyToString(row.expectedTotal),
    actualTotal: moneyToString(row.actualTotal),
    variance: moneyToString(variance),
    status: row.status,
    statusLabel: reconciliationStatusLabel(row.status),
    notes: row.notes,
    reconciledBy: row.reconciledBy
      ? {
          id: row.reconciledBy.id,
          name: `${row.reconciledBy.firstName} ${row.reconciledBy.lastName}`.trim(),
        }
      : null,
    reconciledAt: row.reconciledAt?.toISOString() ?? null,
    matches: (row.matches || []).map((match) => ({
      id: match.id,
      contributionId: match.contributionId,
      externalReference: match.externalReference,
      amount: moneyToString(match.amount),
      matchedAt: match.matchedAt.toISOString(),
      note: match.note,
    })),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Ledger entry for admin lists — no donor PII. */
export function serializeLedgerEntry(row: {
  id: string;
  type: string;
  status: string;
  reference: string;
  amount: Decimal;
  currency: string;
  entryDate: Date;
  description: string | null;
  contributionId: string | null;
  expenseId: string | null;
  createdAt: Date;
  fund?: { id: string; slug: string; name: string } | null;
}) {
  return {
    id: row.id,
    type: row.type,
    status: row.status,
    reference: row.reference,
    amount: moneyToString(row.amount),
    currency: row.currency,
    entryDate: row.entryDate.toISOString(),
    description: row.description,
    fund: row.fund ?? null,
    contributionId: row.contributionId,
    expenseId: row.expenseId,
    createdAt: row.createdAt.toISOString(),
  };
}

export function serializeGivingSchedule(row: {
  id: string;
  amount: Decimal;
  currency: string;
  frequency: string;
  status: string;
  provider: string | null;
  providerReference: string | null;
  nextPaymentAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  fund?: { id: string; slug: string; name: string } | null;
  notes?: string | null;
}) {
  return {
    id: row.id,
    amount: moneyToString(row.amount),
    currency: row.currency,
    frequency: row.frequency,
    status: row.status,
    provider: row.provider,
    providerReference: row.providerReference,
    nextPaymentAt: row.nextPaymentAt?.toISOString() ?? null,
    cancelledAt: row.cancelledAt?.toISOString() ?? null,
    fund: row.fund ?? null,
    notes: row.notes ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
