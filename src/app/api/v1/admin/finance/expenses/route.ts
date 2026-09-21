import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { error, forbidden, paginated, success, validationError } from '@/lib/api/response';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { formatZodErrors } from '@/lib/auth/validation';
import { readJson } from '@/lib/auth/http';
import { canCreateExpense, canViewFinance } from '@/lib/finance/access';
import { serializeExpense } from '@/lib/finance/serialize';
import { expenseListQuerySchema, expenseCreateSchema } from '@/lib/finance/validation';
import { createExpense, expenseInclude } from '@/lib/finance/write';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'finance', 'view');
  if (!auth.ok) return auth.error;
  if (!canViewFinance(auth.user)) return forbidden();

  const url = new URL(request.url);
  const parsed = expenseListQuerySchema.safeParse({
    q: url.searchParams.get('q') || undefined,
    status: url.searchParams.get('status') || undefined,
    categoryId: url.searchParams.get('categoryId') || undefined,
    fundId: url.searchParams.get('fundId') || undefined,
    from: url.searchParams.get('from') || undefined,
    to: url.searchParams.get('to') || undefined,
    page: url.searchParams.get('page') || 1,
    pageSize: url.searchParams.get('pageSize') || 20,
  });
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const { q, status, categoryId, fundId, from, to, page, pageSize } = parsed.data;
  const and: Prisma.ExpenseWhereInput[] = [];
  if (status) and.push({ status });
  if (categoryId) and.push({ categoryId });
  if (fundId) and.push({ fundId });
  if (from) {
    const date = new Date(from);
    if (!Number.isNaN(date.getTime())) and.push({ expenseDate: { gte: date } });
  }
  if (to) {
    const date = new Date(to);
    if (!Number.isNaN(date.getTime())) and.push({ expenseDate: { lte: date } });
  }
  if (q) {
    and.push({
      OR: [
        { reference: { contains: q } },
        { description: { contains: q } },
        { vendor: { contains: q } },
      ],
    });
  }

  const where: Prisma.ExpenseWhereInput = and.length ? { AND: and } : {};
  const [totalItems, rows] = await Promise.all([
    db.expense.count({ where }),
    db.expense.findMany({
      where,
      include: expenseInclude,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return paginated(rows.map(serializeExpense), { page, pageSize, totalItems });
}

export async function POST(request: Request) {
  const auth = await guardAdminWrite(request, 'finance', 'create');
  if (!auth.ok) return auth.error;
  if (!canCreateExpense(auth.user)) return forbidden();

  const parsed = expenseCreateSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const result = await createExpense({
    ...parsed.data,
    submittedById: auth.user.id,
    request,
  });
  if (!result.ok) return error(result.error, 400);

  return success({ expense: serializeExpense(result.expense) }, 'Expense created.', 201);
}
