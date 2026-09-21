import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Decimal } from '@prisma/client/runtime/library';
import { moneyToString, parseMoney } from '@/lib/giving/money';
import { permissionsForRole } from '@/lib/auth/rbac-matrix';
import type { AuthUser } from '@/lib/auth/permissions';
import {
  canApproveExpense,
  canApproveThisExpense,
  canExportFinance,
  canPayExpense,
  canViewFinance,
} from './access';
import { hasPostedIncomeForContribution } from './ledger';
import { computeBudgetRemaining, aggregatePostedEntries } from './reports';
import { canApplyExpenseAction, canTransitionExpense } from './status';

function user(slug: string, id = `${slug}-1`): AuthUser {
  return {
    id,
    email: `${slug}@example.com`,
    firstName: 'Test',
    lastName: 'User',
    phone: null,
    profileImage: null,
    status: 'active',
    isVerified: true,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    role: {
      id: slug,
      slug,
      name: slug,
      hierarchy: 1,
      isPrivileged: slug === 'admin' || slug === 'finance',
    },
    permissions: permissionsForRole(slug).map((key) => {
      const [resource, action] = key.split(':');
      return { resource, action };
    }),
  };
}

describe('finance money & ledger idempotency', () => {
  it('parses money via giving helpers', () => {
    assert.equal(moneyToString(parseMoney('250.50')!), '250.50');
    assert.equal(parseMoney('0'), null);
  });

  it('detects posted income so contribution posting stays idempotent', () => {
    assert.equal(
      hasPostedIncomeForContribution([
        { type: 'income', status: 'posted', contributionId: 'c1' },
      ]),
      true
    );
    assert.equal(
      hasPostedIncomeForContribution([
        { type: 'income', status: 'voided', contributionId: 'c1' },
      ]),
      false
    );
    assert.equal(
      hasPostedIncomeForContribution([
        { type: 'refund', status: 'posted', contributionId: 'c1' },
      ]),
      false
    );
    assert.equal(hasPostedIncomeForContribution([]), false);
  });
});

describe('finance separation of duties', () => {
  it('blocks approving own expense without finance:manage', () => {
    // finance_auditor has view only — cannot approve at all
    const auditor = user('finance_auditor', 'auditor-1');
    assert.equal(canApproveExpense(auditor), false);
    assert.equal(canApproveThisExpense(auditor, { submittedById: 'auditor-1' }), false);

    // Craft a moderate-only user (no manage) via finance role trimmed mentally:
    // Use a synthetic user with moderate but not manage.
    const moderator: AuthUser = {
      ...user('member', 'mod-1'),
      role: { id: 'x', slug: 'staff', name: 'Staff', hierarchy: 40, isPrivileged: false },
      permissions: [
        { resource: 'finance', action: 'view' },
        { resource: 'finance', action: 'moderate' },
      ],
    };
    assert.equal(canApproveExpense(moderator), true);
    assert.equal(canApproveThisExpense(moderator, { submittedById: 'mod-1' }), false);
    assert.equal(canApproveThisExpense(moderator, { submittedById: 'other' }), true);

    const finance = user('finance', 'fin-1');
    assert.equal(canApproveThisExpense(finance, { submittedById: 'fin-1' }), true);
    assert.equal(canPayExpense(finance), true);
    assert.equal(canExportFinance(finance), true);
    assert.equal(canViewFinance(user('member')), false);
  });
});

describe('budget remaining math', () => {
  it('computes remaining as allocated minus spent', () => {
    assert.equal(moneyToString(computeBudgetRemaining('1000.00', '250.50')), '749.50');
    assert.equal(moneyToString(computeBudgetRemaining('100.00', '150.00')), '-50.00');
    assert.equal(moneyToString(computeBudgetRemaining(new Decimal('10.00'), 0)), '10.00');
  });

  it('aggregates posted ledger rows into income/expense/net', () => {
    const summary = aggregatePostedEntries([
      { type: 'income', amount: '100.00', fundId: 'f1', fund: { id: 'f1', name: 'General' } },
      { type: 'income', amount: '50.00', fundId: 'f1', fund: { id: 'f1', name: 'General' } },
      { type: 'expense', amount: '40.00', fundId: 'f1', fund: { id: 'f1', name: 'General' } },
      { type: 'refund', amount: '10.00', fundId: 'f1', fund: { id: 'f1', name: 'General' } },
    ]);
    assert.equal(summary.income, '150.00');
    assert.equal(summary.expense, '40.00');
    assert.equal(summary.refund, '10.00');
    assert.equal(summary.net, '100.00');
    assert.equal(summary.byFund[0]?.net, '100.00');
  });
});

describe('expense status transitions', () => {
  it('allows expected workflow actions only', () => {
    assert.equal(canTransitionExpense('draft', 'submitted'), true);
    assert.equal(canApplyExpenseAction('draft', 'submit'), true);
    assert.equal(canApplyExpenseAction('submitted', 'approve'), true);
    assert.equal(canApplyExpenseAction('approved', 'pay'), true);
    assert.equal(canApplyExpenseAction('paid', 'cancel'), false);
    assert.equal(canApplyExpenseAction('draft', 'pay'), false);
  });
});
