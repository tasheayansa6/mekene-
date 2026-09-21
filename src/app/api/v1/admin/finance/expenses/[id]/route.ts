import { db } from '@/lib/db';
import { error, forbidden, notFound, success, validationError } from '@/lib/api/response';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { formatZodErrors } from '@/lib/auth/validation';
import { readJson } from '@/lib/auth/http';
import { canUpdateExpense, canViewFinance } from '@/lib/finance/access';
import { serializeExpense } from '@/lib/finance/serialize';
import { expenseUpdateSchema } from '@/lib/finance/validation';
import {
  applyExpenseAction,
  expenseInclude,
  updateExpenseFields,
} from '@/lib/finance/write';

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const auth = await guardAdminRead(request, 'finance', 'view');
  if (!auth.ok) return auth.error;
  if (!canViewFinance(auth.user)) return forbidden();

  const { id } = await params;
  const expense = await db.expense.findUnique({
    where: { id },
    include: expenseInclude,
  });
  if (!expense) return notFound('Expense');

  return success({ expense: serializeExpense(expense) });
}

export async function PATCH(request: Request, { params }: Params) {
  // Auth first so the body is only read once. Finer action checks live in applyExpenseAction.
  const auth = await guardAdminWrite(request, 'finance', 'update');
  if (!auth.ok) return auth.error;

  const { id } = await params;
  const parsed = expenseUpdateSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  if (parsed.data.action) {
    const result = await applyExpenseAction({
      expenseId: id,
      action: parsed.data.action,
      actor: auth.user,
      rejectionReason: parsed.data.rejectionReason,
      request,
    });
    if (!result.ok) return error(result.error, (result.status as 400 | 403 | 404) || 400);
    return success({ expense: serializeExpense(result.expense) }, 'Expense updated.');
  }

  if (!canUpdateExpense(auth.user)) return forbidden();

  const result = await updateExpenseFields({
    expenseId: id,
    actor: auth.user,
    categoryId: parsed.data.categoryId,
    fundId: parsed.data.fundId,
    amount: parsed.data.amount,
    vendor: parsed.data.vendor,
    description: parsed.data.description,
    expenseDate: parsed.data.expenseDate,
    request,
  });
  if (!result.ok) return error(result.error, (result.status as 400 | 403 | 404) || 400);

  return success({ expense: serializeExpense(result.expense) }, 'Expense updated.');
}
