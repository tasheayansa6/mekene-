export const EXPENSE_STATUSES = [
  'draft',
  'submitted',
  'under_review',
  'approved',
  'rejected',
  'paid',
  'cancelled',
] as const;
export type ExpenseStatusValue = (typeof EXPENSE_STATUSES)[number];

export const BUDGET_STATUSES = ['draft', 'active', 'closed', 'archived'] as const;
export type BudgetStatusValue = (typeof BUDGET_STATUSES)[number];

export const BUDGET_PERIODS = ['monthly', 'quarterly', 'annual'] as const;
export type BudgetPeriodValue = (typeof BUDGET_PERIODS)[number];

export const RECONCILIATION_STATUSES = [
  'open',
  'in_progress',
  'reconciled',
  'disputed',
  'closed',
] as const;
export type ReconciliationStatusValue = (typeof RECONCILIATION_STATUSES)[number];

export const FINANCIAL_ENTRY_TYPES = ['income', 'expense', 'refund', 'adjustment'] as const;
export type FinancialEntryTypeValue = (typeof FINANCIAL_ENTRY_TYPES)[number];

export const FINANCIAL_ENTRY_STATUSES = ['posted', 'voided'] as const;

export const GIVING_SCHEDULE_STATUSES = ['active', 'paused', 'cancelled', 'completed'] as const;

export const EXPENSE_STATUS_LABELS: Record<ExpenseStatusValue, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  under_review: 'Under review',
  approved: 'Approved',
  rejected: 'Rejected',
  paid: 'Paid',
  cancelled: 'Cancelled',
};

export const BUDGET_STATUS_LABELS: Record<BudgetStatusValue, string> = {
  draft: 'Draft',
  active: 'Active',
  closed: 'Closed',
  archived: 'Archived',
};

export const RECONCILIATION_STATUS_LABELS: Record<ReconciliationStatusValue, string> = {
  open: 'Open',
  in_progress: 'In progress',
  reconciled: 'Reconciled',
  disputed: 'Disputed',
  closed: 'Closed',
};

export const EXPENSE_ACTIONS = [
  'submit',
  'review',
  'approve',
  'reject',
  'pay',
  'cancel',
] as const;
export type ExpenseActionValue = (typeof EXPENSE_ACTIONS)[number];

/** Allowed status transitions for expenses (action-driven). */
const EXPENSE_TRANSITIONS: Record<ExpenseStatusValue, ExpenseStatusValue[]> = {
  draft: ['submitted', 'cancelled'],
  submitted: ['under_review', 'approved', 'rejected', 'cancelled'],
  under_review: ['approved', 'rejected', 'cancelled'],
  approved: ['paid', 'cancelled'],
  rejected: [],
  paid: [],
  cancelled: [],
};

const ACTION_TARGET: Record<ExpenseActionValue, ExpenseStatusValue> = {
  submit: 'submitted',
  review: 'under_review',
  approve: 'approved',
  reject: 'rejected',
  pay: 'paid',
  cancel: 'cancelled',
};

export function canTransitionExpense(from: string, to: string): boolean {
  if (from === to) return true;
  const allowed = EXPENSE_TRANSITIONS[from as ExpenseStatusValue];
  if (!allowed) return false;
  return allowed.includes(to as ExpenseStatusValue);
}

export function expenseStatusForAction(action: ExpenseActionValue): ExpenseStatusValue {
  return ACTION_TARGET[action];
}

export function canApplyExpenseAction(from: string, action: ExpenseActionValue): boolean {
  return canTransitionExpense(from, expenseStatusForAction(action));
}

export function expenseStatusLabel(status: string): string {
  return EXPENSE_STATUS_LABELS[status as ExpenseStatusValue] || status;
}

export function budgetStatusLabel(status: string): string {
  return BUDGET_STATUS_LABELS[status as BudgetStatusValue] || status;
}

export function reconciliationStatusLabel(status: string): string {
  return RECONCILIATION_STATUS_LABELS[status as ReconciliationStatusValue] || status;
}
