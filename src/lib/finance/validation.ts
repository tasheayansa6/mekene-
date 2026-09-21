import { z } from 'zod';
import {
  BUDGET_PERIODS,
  BUDGET_STATUSES,
  EXPENSE_ACTIONS,
  EXPENSE_STATUSES,
  RECONCILIATION_STATUSES,
} from './status';

const moneyString = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, 'Amount must be a positive decimal with up to 2 places');

const nonNegativeMoneyString = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, 'Amount must be a non-negative decimal with up to 2 places');

export const expenseCreateSchema = z.object({
  categoryId: z.string().min(1).optional().nullable(),
  fundId: z.string().min(1).optional().nullable(),
  amount: moneyString,
  currency: z.literal('ETB').default('ETB'),
  vendor: z.string().trim().max(160).optional().nullable(),
  description: z.string().trim().min(3).max(2000),
  expenseDate: z.string().min(1),
  status: z.enum(['draft', 'submitted']).optional().default('draft'),
});

export const expenseUpdateSchema = z.object({
  categoryId: z.string().min(1).optional().nullable(),
  fundId: z.string().min(1).optional().nullable(),
  amount: moneyString.optional(),
  vendor: z.string().trim().max(160).optional().nullable(),
  description: z.string().trim().min(3).max(2000).optional(),
  expenseDate: z.string().min(1).optional(),
  action: z.enum(EXPENSE_ACTIONS).optional(),
  rejectionReason: z.string().trim().min(3).max(500).optional().nullable(),
});

export const expenseListQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  status: z.enum(EXPENSE_STATUSES).optional(),
  categoryId: z.string().optional(),
  fundId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export const expenseCategorySchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  description: z.string().trim().max(400).optional().nullable(),
  isActive: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).max(999).optional(),
});

export const budgetCreateSchema = z.object({
  name: z.string().trim().min(2).max(160),
  fundId: z.string().min(1).optional().nullable(),
  expenseCategoryId: z.string().min(1).optional().nullable(),
  period: z.enum(BUDGET_PERIODS).default('annual'),
  periodStart: z.string().min(1),
  periodEnd: z.string().min(1),
  allocatedAmount: moneyString,
  currency: z.literal('ETB').default('ETB'),
  status: z.enum(BUDGET_STATUSES).optional().default('draft'),
});

export const budgetPatchSchema = budgetCreateSchema.partial();

export const budgetListQuerySchema = z.object({
  status: z.enum(BUDGET_STATUSES).optional(),
  fundId: z.string().optional(),
  expenseCategoryId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export const reconciliationCreateSchema = z.object({
  periodLabel: z.string().trim().min(2).max(120),
  source: z.string().trim().min(2).max(120),
  statementReference: z.string().trim().max(160).optional().nullable(),
  openingBalance: nonNegativeMoneyString.optional().default('0.00'),
  closingBalance: nonNegativeMoneyString.optional().default('0.00'),
  expectedTotal: nonNegativeMoneyString.optional().default('0.00'),
  actualTotal: nonNegativeMoneyString.optional().default('0.00'),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export const reconciliationPatchSchema = z.object({
  status: z.enum(RECONCILIATION_STATUSES).optional(),
  statementReference: z.string().trim().max(160).optional().nullable(),
  openingBalance: nonNegativeMoneyString.optional(),
  closingBalance: nonNegativeMoneyString.optional(),
  expectedTotal: nonNegativeMoneyString.optional(),
  actualTotal: nonNegativeMoneyString.optional(),
  notes: z.string().trim().max(2000).optional().nullable(),
  match: z
    .object({
      contributionId: z.string().min(1).optional().nullable(),
      externalReference: z.string().trim().max(160).optional().nullable(),
      amount: moneyString,
      note: z.string().trim().max(400).optional().nullable(),
    })
    .optional(),
});

export const reconciliationListQuerySchema = z.object({
  status: z.enum(RECONCILIATION_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export const ledgerListQuerySchema = z.object({
  type: z.enum(['income', 'expense', 'refund', 'adjustment']).optional(),
  fundId: z.string().optional(),
  status: z.enum(['posted', 'voided']).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export const reportQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  fundId: z.string().optional(),
});

export const givingScheduleCreateSchema = z.object({
  fundId: z.string().min(1),
  amount: moneyString,
  currency: z.literal('ETB').default('ETB'),
  frequency: z.enum(['monthly', 'quarterly', 'yearly']).default('monthly'),
  nextPaymentAt: z.string().optional().nullable(),
  providerReference: z.string().trim().max(160).optional().nullable(),
});
