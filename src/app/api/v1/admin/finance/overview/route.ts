import { db } from '@/lib/db';
import { forbidden, success } from '@/lib/api/response';
import { guardAdminRead } from '@/lib/admin/guard';
import { canViewFinance } from '@/lib/finance/access';
import { aggregatePostedEntries } from '@/lib/finance/reports';
import { serializeExpense } from '@/lib/finance/serialize';
import { expenseInclude } from '@/lib/finance/write';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'finance', 'view');
  if (!auth.ok) return auth.error;
  if (!canViewFinance(auth.user)) return forbidden();

  const [posted, draftExpenses, pendingApproval, recentExpenses, openReconciliations, activeBudgets] =
    await Promise.all([
      db.financialEntry.findMany({
        where: { status: 'posted' },
        select: {
          type: true,
          amount: true,
          fundId: true,
          fund: { select: { id: true, name: true } },
        },
      }),
      db.expense.count({ where: { status: 'draft' } }),
      db.expense.count({ where: { status: { in: ['submitted', 'under_review'] } } }),
      db.expense.findMany({
        include: expenseInclude,
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
      db.reconciliation.count({
        where: { status: { in: ['open', 'in_progress', 'disputed'] } },
      }),
      db.budget.count({ where: { status: 'active' } }),
    ]);

  const summary = aggregatePostedEntries(posted);

  return success({
    metrics: {
      income: summary.income,
      expense: summary.expense,
      refund: summary.refund,
      net: summary.net,
      currency: 'ETB',
      draftExpenseCount: draftExpenses,
      pendingApprovalCount: pendingApproval,
      openReconciliationCount: openReconciliations,
      activeBudgetCount: activeBudgets,
      // Aggregates only — no donor PII on finance dashboard
      ledgerEntryCount: posted.length,
    },
    byFund: summary.byFund,
    recentExpenses: recentExpenses.map(serializeExpense),
  });
}
