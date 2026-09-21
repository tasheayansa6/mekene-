import { Decimal } from '@prisma/client/runtime/library';
import type { AuthUser } from '@/lib/auth/permissions';
import { db } from '@/lib/db';
import { parseMoney } from '@/lib/giving/money';
import { getPaymentProvider } from '@/lib/giving/providers';
import {
  canApproveExpense,
  canApproveThisExpense,
  canCreateExpense,
  canManageBudgets,
  canPayExpense,
  canReconcile,
  canUpdateExpense,
} from './access';
import { emitFinanceEvent } from './events';
import { nextExpenseReference, postExpensePaid } from './ledger';
import { spentAgainstBudget } from './reports';
import {
  canApplyExpenseAction,
  expenseStatusForAction,
  type ExpenseActionValue,
} from './status';

export const expenseInclude = {
  category: { select: { id: true, slug: true, name: true } },
  fund: { select: { id: true, slug: true, name: true } },
  submittedBy: { select: { id: true, firstName: true, lastName: true } },
  reviewedBy: { select: { id: true, firstName: true, lastName: true } },
  documents: {
    select: {
      id: true,
      title: true,
      fileUrl: true,
      fileName: true,
      createdAt: true,
    },
  },
} as const;

export const budgetInclude = {
  fund: { select: { id: true, slug: true, name: true } },
  expenseCategory: { select: { id: true, slug: true, name: true } },
  createdBy: { select: { id: true, firstName: true, lastName: true } },
} as const;

export const reconciliationInclude = {
  reconciledBy: { select: { id: true, firstName: true, lastName: true } },
  matches: true,
} as const;

/** Allows zero for reconciliation balances (parseMoney rejects non-positive). */
function parseNonNegativeMoney(value: unknown): Decimal | null {
  if (value === undefined || value === null || value === '') {
    return new Decimal(0);
  }
  if (typeof value === 'string' && /^\d+(\.\d{1,2})?$/.test(value.trim())) {
    const money = new Decimal(value.trim());
    if (money.isFinite() && money.gte(0)) return money.toDecimalPlaces(2);
    return null;
  }
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return new Decimal(value.toFixed(2));
  }
  if (value instanceof Decimal && value.isFinite() && value.gte(0)) {
    return value.toDecimalPlaces(2);
  }
  return null;
}

export async function createExpense(input: {
  categoryId?: string | null;
  fundId?: string | null;
  amount: string;
  currency?: string;
  vendor?: string | null;
  description: string;
  expenseDate: string;
  status?: 'draft' | 'submitted';
  submittedById: string;
  request?: Request;
}) {
  const amount = parseMoney(input.amount);
  if (!amount) return { ok: false as const, error: 'Invalid expense amount.' };

  const expenseDate = new Date(input.expenseDate);
  if (Number.isNaN(expenseDate.getTime())) {
    return { ok: false as const, error: 'Invalid expense date.' };
  }

  const status = input.status === 'submitted' ? 'submitted' : 'draft';
  const reference = await nextExpenseReference();

  const expense = await db.expense.create({
    data: {
      reference,
      categoryId: input.categoryId || null,
      fundId: input.fundId || null,
      amount,
      currency: input.currency || 'ETB',
      vendor: input.vendor || null,
      description: input.description,
      expenseDate,
      status,
      submittedById: input.submittedById,
    },
    include: expenseInclude,
  });

  await emitFinanceEvent({
    type: status === 'submitted' ? 'finance.expense_submitted' : 'finance.expense_created',
    userId: input.submittedById,
    entityId: expense.id,
    request: input.request,
    details: { reference: expense.reference, status },
  });

  return { ok: true as const, expense };
}

export async function updateExpenseFields(input: {
  expenseId: string;
  actor: AuthUser;
  categoryId?: string | null;
  fundId?: string | null;
  amount?: string;
  vendor?: string | null;
  description?: string;
  expenseDate?: string;
  request?: Request;
}) {
  if (!canUpdateExpense(input.actor) && !canCreateExpense(input.actor)) {
    return { ok: false as const, error: 'Not allowed to update expenses.', status: 403 };
  }

  const existing = await db.expense.findUnique({ where: { id: input.expenseId } });
  if (!existing) return { ok: false as const, error: 'Expense not found.', status: 404 };
  if (existing.status !== 'draft' && existing.status !== 'submitted') {
    return {
      ok: false as const,
      error: 'Only draft or submitted expenses can be edited.',
      status: 400,
    };
  }

  const data: Record<string, unknown> = {};
  if (input.categoryId !== undefined) data.categoryId = input.categoryId;
  if (input.fundId !== undefined) data.fundId = input.fundId;
  if (input.vendor !== undefined) data.vendor = input.vendor;
  if (input.description !== undefined) data.description = input.description;
  if (input.amount !== undefined) {
    const amount = parseMoney(input.amount);
    if (!amount) return { ok: false as const, error: 'Invalid expense amount.', status: 400 };
    data.amount = amount;
  }
  if (input.expenseDate !== undefined) {
    const expenseDate = new Date(input.expenseDate);
    if (Number.isNaN(expenseDate.getTime())) {
      return { ok: false as const, error: 'Invalid expense date.', status: 400 };
    }
    data.expenseDate = expenseDate;
  }

  const expense = await db.expense.update({
    where: { id: existing.id },
    data,
    include: expenseInclude,
  });

  return { ok: true as const, expense };
}

export async function applyExpenseAction(input: {
  expenseId: string;
  action: ExpenseActionValue;
  actor: AuthUser;
  rejectionReason?: string | null;
  request?: Request;
}) {
  const existing = await db.expense.findUnique({ where: { id: input.expenseId } });
  if (!existing) return { ok: false as const, error: 'Expense not found.', status: 404 };

  if (!canApplyExpenseAction(existing.status, input.action)) {
    return {
      ok: false as const,
      error: `Cannot ${input.action} an expense in status ${existing.status}.`,
      status: 400,
    };
  }

  const nextStatus = expenseStatusForAction(input.action);

  if (input.action === 'submit') {
    if (!canCreateExpense(input.actor) && !canUpdateExpense(input.actor)) {
      return { ok: false as const, error: 'Not allowed to submit expenses.', status: 403 };
    }
  } else if (input.action === 'review') {
    if (!canApproveExpense(input.actor)) {
      return { ok: false as const, error: 'Not allowed to review expenses.', status: 403 };
    }
  } else if (input.action === 'approve') {
    if (!canApproveThisExpense(input.actor, existing)) {
      return {
        ok: false as const,
        error: 'You cannot approve your own expense without finance:manage.',
        status: 403,
      };
    }
  } else if (input.action === 'reject') {
    if (!canApproveThisExpense(input.actor, existing)) {
      return {
        ok: false as const,
        error: 'You cannot reject your own expense without finance:manage.',
        status: 403,
      };
    }
    if (!input.rejectionReason?.trim()) {
      return { ok: false as const, error: 'Rejection reason is required.', status: 400 };
    }
  } else if (input.action === 'pay') {
    if (!canPayExpense(input.actor)) {
      return { ok: false as const, error: 'Not allowed to pay expenses.', status: 403 };
    }
  } else if (input.action === 'cancel') {
    if (
      !canUpdateExpense(input.actor) &&
      !(canCreateExpense(input.actor) && existing.submittedById === input.actor.id)
    ) {
      return { ok: false as const, error: 'Not allowed to cancel this expense.', status: 403 };
    }
  }

  const now = new Date();
  const data: Record<string, unknown> = { status: nextStatus };

  if (input.action === 'approve' || input.action === 'reject' || input.action === 'review') {
    data.reviewedById = input.actor.id;
    data.reviewedAt = now;
  }
  if (input.action === 'reject') {
    data.rejectionReason = input.rejectionReason!.trim();
  }
  if (input.action === 'pay') {
    data.paidAt = now;
  }

  const expense = await db.$transaction(async (tx) => {
    const updated = await tx.expense.update({
      where: { id: existing.id },
      data,
      include: expenseInclude,
    });
    if (input.action === 'pay') {
      await postExpensePaid(updated, { createdById: input.actor.id, tx });
    }
    return updated;
  });

  const eventMap: Partial<
    Record<ExpenseActionValue, Parameters<typeof emitFinanceEvent>[0]['type']>
  > = {
    submit: 'finance.expense_submitted',
    approve: 'finance.expense_approved',
    reject: 'finance.expense_rejected',
    pay: 'finance.expense_paid',
    cancel: 'finance.expense_cancelled',
  };
  const eventType = eventMap[input.action];
  if (eventType) {
    await emitFinanceEvent({
      type: eventType,
      userId: input.actor.id,
      entityId: expense.id,
      request: input.request,
      notifyUserId: expense.submittedById,
      details: { reference: expense.reference, status: expense.status },
    });
  }

  return { ok: true as const, expense };
}

export async function createBudget(input: {
  name: string;
  fundId?: string | null;
  expenseCategoryId?: string | null;
  period: 'monthly' | 'quarterly' | 'annual';
  periodStart: string;
  periodEnd: string;
  allocatedAmount: string;
  currency?: string;
  status?: 'draft' | 'active' | 'closed' | 'archived';
  createdById: string;
  actor: AuthUser;
  request?: Request;
}) {
  if (!canManageBudgets(input.actor)) {
    return { ok: false as const, error: 'Not allowed to manage budgets.', status: 403 };
  }

  const allocatedAmount = parseMoney(input.allocatedAmount);
  if (!allocatedAmount) return { ok: false as const, error: 'Invalid allocated amount.', status: 400 };

  const periodStart = new Date(input.periodStart);
  const periodEnd = new Date(input.periodEnd);
  if (Number.isNaN(periodStart.getTime()) || Number.isNaN(periodEnd.getTime())) {
    return { ok: false as const, error: 'Invalid budget period dates.', status: 400 };
  }
  if (periodEnd < periodStart) {
    return { ok: false as const, error: 'periodEnd must be on or after periodStart.', status: 400 };
  }

  const budget = await db.budget.create({
    data: {
      name: input.name,
      fundId: input.fundId || null,
      expenseCategoryId: input.expenseCategoryId || null,
      period: input.period,
      periodStart,
      periodEnd,
      allocatedAmount,
      currency: input.currency || 'ETB',
      status: input.status || 'draft',
      createdById: input.createdById,
    },
    include: budgetInclude,
  });

  await emitFinanceEvent({
    type: 'finance.budget_created',
    userId: input.createdById,
    entityId: budget.id,
    request: input.request,
    details: { name: budget.name, status: budget.status },
  });

  return { ok: true as const, budget };
}

export async function updateBudget(input: {
  budgetId: string;
  actor: AuthUser;
  name?: string;
  fundId?: string | null;
  expenseCategoryId?: string | null;
  period?: 'monthly' | 'quarterly' | 'annual';
  periodStart?: string;
  periodEnd?: string;
  allocatedAmount?: string;
  status?: 'draft' | 'active' | 'closed' | 'archived';
  request?: Request;
}) {
  if (!canManageBudgets(input.actor)) {
    return { ok: false as const, error: 'Not allowed to manage budgets.', status: 403 };
  }

  const existing = await db.budget.findUnique({ where: { id: input.budgetId } });
  if (!existing) return { ok: false as const, error: 'Budget not found.', status: 404 };

  const data: Record<string, unknown> = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.fundId !== undefined) data.fundId = input.fundId;
  if (input.expenseCategoryId !== undefined) data.expenseCategoryId = input.expenseCategoryId;
  if (input.period !== undefined) data.period = input.period;
  if (input.status !== undefined) data.status = input.status;
  if (input.allocatedAmount !== undefined) {
    const allocatedAmount = parseMoney(input.allocatedAmount);
    if (!allocatedAmount) {
      return { ok: false as const, error: 'Invalid allocated amount.', status: 400 };
    }
    data.allocatedAmount = allocatedAmount;
  }
  if (input.periodStart !== undefined) {
    const periodStart = new Date(input.periodStart);
    if (Number.isNaN(periodStart.getTime())) {
      return { ok: false as const, error: 'Invalid periodStart.', status: 400 };
    }
    data.periodStart = periodStart;
  }
  if (input.periodEnd !== undefined) {
    const periodEnd = new Date(input.periodEnd);
    if (Number.isNaN(periodEnd.getTime())) {
      return { ok: false as const, error: 'Invalid periodEnd.', status: 400 };
    }
    data.periodEnd = periodEnd;
  }

  const budget = await db.budget.update({
    where: { id: existing.id },
    data,
    include: budgetInclude,
  });

  await emitFinanceEvent({
    type: 'finance.budget_updated',
    userId: input.actor.id,
    entityId: budget.id,
    request: input.request,
    details: { name: budget.name, status: budget.status },
  });

  return { ok: true as const, budget };
}

export async function createReconciliation(input: {
  periodLabel: string;
  source: string;
  statementReference?: string | null;
  openingBalance?: string;
  closingBalance?: string;
  expectedTotal?: string;
  actualTotal?: string;
  notes?: string | null;
  actor: AuthUser;
  request?: Request;
}) {
  if (!canReconcile(input.actor)) {
    return { ok: false as const, error: 'Not allowed to reconcile.', status: 403 };
  }

  const openingBalance = parseNonNegativeMoney(input.openingBalance ?? '0.00');
  const closingBalance = parseNonNegativeMoney(input.closingBalance ?? '0.00');
  const expectedTotal = parseNonNegativeMoney(input.expectedTotal ?? '0.00');
  const actualTotal = parseNonNegativeMoney(input.actualTotal ?? '0.00');
  if (!openingBalance || !closingBalance || !expectedTotal || !actualTotal) {
    return { ok: false as const, error: 'Invalid balance amounts.', status: 400 };
  }

  const reconciliation = await db.reconciliation.create({
    data: {
      periodLabel: input.periodLabel,
      source: input.source,
      statementReference: input.statementReference || null,
      openingBalance,
      closingBalance,
      expectedTotal,
      actualTotal,
      notes: input.notes || null,
      status: 'open',
      reconciledById: input.actor.id,
    },
    include: reconciliationInclude,
  });

  await emitFinanceEvent({
    type: 'finance.reconciliation_created',
    userId: input.actor.id,
    entityId: reconciliation.id,
    request: input.request,
    details: { periodLabel: reconciliation.periodLabel },
  });

  return { ok: true as const, reconciliation };
}

export async function updateReconciliation(input: {
  reconciliationId: string;
  actor: AuthUser;
  status?: 'open' | 'in_progress' | 'reconciled' | 'disputed' | 'closed';
  statementReference?: string | null;
  openingBalance?: string;
  closingBalance?: string;
  expectedTotal?: string;
  actualTotal?: string;
  notes?: string | null;
  match?: {
    contributionId?: string | null;
    externalReference?: string | null;
    amount: string;
    note?: string | null;
  };
  request?: Request;
}) {
  if (!canReconcile(input.actor)) {
    return { ok: false as const, error: 'Not allowed to reconcile.', status: 403 };
  }

  const existing = await db.reconciliation.findUnique({
    where: { id: input.reconciliationId },
  });
  if (!existing) return { ok: false as const, error: 'Reconciliation not found.', status: 404 };
  if (existing.status === 'closed') {
    return { ok: false as const, error: 'Closed reconciliations cannot be edited.', status: 400 };
  }

  const data: Record<string, unknown> = {};
  if (input.statementReference !== undefined) data.statementReference = input.statementReference;
  if (input.notes !== undefined) data.notes = input.notes;
  if (input.status !== undefined) {
    data.status = input.status;
    if (input.status === 'reconciled' || input.status === 'closed') {
      data.reconciledAt = new Date();
      data.reconciledById = input.actor.id;
    }
  }
  for (const [key, raw] of [
    ['openingBalance', input.openingBalance],
    ['closingBalance', input.closingBalance],
    ['expectedTotal', input.expectedTotal],
    ['actualTotal', input.actualTotal],
  ] as const) {
    if (raw !== undefined) {
      const money = parseNonNegativeMoney(raw);
      if (!money) return { ok: false as const, error: `Invalid ${key}.`, status: 400 };
      data[key] = money;
    }
  }

  const reconciliation = await db.$transaction(async (tx) => {
    if (input.match) {
      const amount = parseMoney(input.match.amount);
      if (!amount) throw new Error('Invalid match amount.');
      await tx.reconciliationMatch.create({
        data: {
          reconciliationId: existing.id,
          contributionId: input.match.contributionId || null,
          externalReference: input.match.externalReference || null,
          amount,
          note: input.match.note || null,
        },
      });
      if (!input.status && existing.status === 'open') {
        data.status = 'in_progress';
      }
    }
    return tx.reconciliation.update({
      where: { id: existing.id },
      data,
      include: reconciliationInclude,
    });
  });

  if (input.status === 'closed' || input.status === 'reconciled') {
    await emitFinanceEvent({
      type: 'finance.reconciliation_closed',
      userId: input.actor.id,
      entityId: reconciliation.id,
      request: input.request,
      details: { periodLabel: reconciliation.periodLabel, status: reconciliation.status },
    });
  }

  return { ok: true as const, reconciliation };
}

export async function createGivingSchedule(input: {
  userId: string;
  fundId: string;
  amount: string;
  currency?: string;
  frequency: 'monthly' | 'quarterly' | 'yearly';
  nextPaymentAt?: string | null;
  providerReference?: string | null;
  request?: Request;
}) {
  const amount = parseMoney(input.amount);
  if (!amount) return { ok: false as const, error: 'Invalid schedule amount.' };

  const fund = await db.donationCategory.findUnique({ where: { id: input.fundId } });
  if (!fund || !fund.isActive) {
    return { ok: false as const, error: 'Contribution fund is not available.' };
  }

  const provider = getPaymentProvider();
  const nextPaymentAt = input.nextPaymentAt ? new Date(input.nextPaymentAt) : null;
  if (input.nextPaymentAt && Number.isNaN(nextPaymentAt!.getTime())) {
    return { ok: false as const, error: 'Invalid nextPaymentAt.' };
  }

  const schedule = await db.givingSchedule.create({
    data: {
      userId: input.userId,
      fundId: input.fundId,
      amount,
      currency: input.currency || 'ETB',
      frequency: input.frequency,
      status: 'active',
      provider: provider.id,
      providerReference: provider.supportsRecurring
        ? input.providerReference || null
        : null,
      nextPaymentAt,
    },
    include: {
      fund: { select: { id: true, slug: true, name: true } },
    },
  });

  const notes = provider.supportsRecurring
    ? null
    : 'pending provider';

  await emitFinanceEvent({
    type: 'finance.schedule_created',
    userId: input.userId,
    entityId: schedule.id,
    request: input.request,
    details: {
      frequency: schedule.frequency,
      recurringSupported: provider.supportsRecurring,
    },
  });

  return {
    ok: true as const,
    schedule,
    notes,
    message: provider.supportsRecurring
      ? 'Giving schedule created.'
      : 'Giving schedule recorded. Automatic charging is pending provider support.',
  };
}

export async function cancelGivingSchedule(input: {
  scheduleId: string;
  userId: string;
  request?: Request;
}) {
  const existing = await db.givingSchedule.findUnique({ where: { id: input.scheduleId } });
  if (!existing) return { ok: false as const, error: 'Schedule not found.', status: 404 };
  if (existing.userId !== input.userId) {
    return { ok: false as const, error: 'Not allowed.', status: 403 };
  }
  if (existing.status === 'cancelled') {
    return { ok: true as const, schedule: existing, skipped: true as const };
  }

  const schedule = await db.givingSchedule.update({
    where: { id: existing.id },
    data: {
      status: 'cancelled',
      cancelledAt: new Date(),
    },
    include: {
      fund: { select: { id: true, slug: true, name: true } },
    },
  });

  await emitFinanceEvent({
    type: 'finance.schedule_cancelled',
    userId: input.userId,
    entityId: schedule.id,
    request: input.request,
    details: { status: 'cancelled' },
  });

  return { ok: true as const, schedule, skipped: false as const };
}

export async function budgetWithSpent(budgetId: string) {
  const budget = await db.budget.findUnique({
    where: { id: budgetId },
    include: budgetInclude,
  });
  if (!budget) return null;
  const spent = await spentAgainstBudget({
    fundId: budget.fundId,
    expenseCategoryId: budget.expenseCategoryId,
    periodStart: budget.periodStart,
    periodEnd: budget.periodEnd,
  });
  return { budget, spent };
}
