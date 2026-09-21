import { error, forbidden, success, validationError } from '@/lib/api/response';
import { guardAdminWrite } from '@/lib/admin/guard';
import { formatZodErrors } from '@/lib/auth/validation';
import { readJson } from '@/lib/auth/http';
import { canManageBudgets } from '@/lib/finance/access';
import { serializeBudget } from '@/lib/finance/serialize';
import { spentAgainstBudget } from '@/lib/finance/reports';
import { budgetPatchSchema } from '@/lib/finance/validation';
import { updateBudget } from '@/lib/finance/write';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const auth = await guardAdminWrite(request, 'finance', 'update');
  if (!auth.ok) return auth.error;
  if (!canManageBudgets(auth.user)) return forbidden();

  const { id } = await params;
  const parsed = budgetPatchSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const result = await updateBudget({
    budgetId: id,
    actor: auth.user,
    ...parsed.data,
    request,
  });
  if (!result.ok) return error(result.error, (result.status as 400 | 403 | 404) || 400);

  const spent = await spentAgainstBudget({
    fundId: result.budget.fundId,
    expenseCategoryId: result.budget.expenseCategoryId,
    periodStart: result.budget.periodStart,
    periodEnd: result.budget.periodEnd,
  });

  return success({ budget: serializeBudget(result.budget, spent) }, 'Budget updated.');
}
