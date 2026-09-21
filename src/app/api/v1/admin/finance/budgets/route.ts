import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { error, forbidden, paginated, success, validationError } from '@/lib/api/response';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { formatZodErrors } from '@/lib/auth/validation';
import { readJson } from '@/lib/auth/http';
import { canManageBudgets, canViewFinance } from '@/lib/finance/access';
import { serializeBudget } from '@/lib/finance/serialize';
import { spentAgainstBudget } from '@/lib/finance/reports';
import { budgetCreateSchema, budgetListQuerySchema } from '@/lib/finance/validation';
import { budgetInclude, createBudget } from '@/lib/finance/write';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'finance', 'view');
  if (!auth.ok) return auth.error;
  if (!canViewFinance(auth.user)) return forbidden();

  const url = new URL(request.url);
  const parsed = budgetListQuerySchema.safeParse({
    status: url.searchParams.get('status') || undefined,
    fundId: url.searchParams.get('fundId') || undefined,
    expenseCategoryId: url.searchParams.get('expenseCategoryId') || undefined,
    page: url.searchParams.get('page') || 1,
    pageSize: url.searchParams.get('pageSize') || 20,
  });
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const { status, fundId, expenseCategoryId, page, pageSize } = parsed.data;
  const where: Prisma.BudgetWhereInput = {};
  if (status) where.status = status;
  if (fundId) where.fundId = fundId;
  if (expenseCategoryId) where.expenseCategoryId = expenseCategoryId;

  const [totalItems, rows] = await Promise.all([
    db.budget.count({ where }),
    db.budget.findMany({
      where,
      include: budgetInclude,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const serialized = await Promise.all(
    rows.map(async (row) => {
      const spent = await spentAgainstBudget({
        fundId: row.fundId,
        expenseCategoryId: row.expenseCategoryId,
        periodStart: row.periodStart,
        periodEnd: row.periodEnd,
      });
      return serializeBudget(row, spent);
    })
  );

  return paginated(serialized, { page, pageSize, totalItems });
}

export async function POST(request: Request) {
  const auth = await guardAdminWrite(request, 'finance', 'create');
  if (!auth.ok) return auth.error;
  if (!canManageBudgets(auth.user)) return forbidden();

  const parsed = budgetCreateSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const result = await createBudget({
    ...parsed.data,
    createdById: auth.user.id,
    actor: auth.user,
    request,
  });
  if (!result.ok) return error(result.error, (result.status as 400 | 403) || 400);

  return success({ budget: serializeBudget(result.budget) }, 'Budget created.', 201);
}
