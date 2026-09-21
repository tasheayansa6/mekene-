import { db } from '@/lib/db';
import { forbidden, success, validationError } from '@/lib/api/response';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { formatZodErrors } from '@/lib/auth/validation';
import { readJson } from '@/lib/auth/http';
import { slugify } from '@/lib/admin/slug';
import { canManageBudgets, canViewFinance } from '@/lib/finance/access';
import { serializeExpenseCategory } from '@/lib/finance/serialize';
import { expenseCategorySchema } from '@/lib/finance/validation';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'finance', 'view');
  if (!auth.ok) return auth.error;
  if (!canViewFinance(auth.user)) return forbidden();

  const rows = await db.expenseCategory.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });
  return success({ categories: rows.map(serializeExpenseCategory) });
}

export async function POST(request: Request) {
  const auth = await guardAdminWrite(request, 'finance', 'manage');
  if (!auth.ok) return auth.error;
  if (!canManageBudgets(auth.user)) return forbidden();

  const parsed = expenseCategorySchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const created = await db.expenseCategory.create({
    data: {
      name: parsed.data.name,
      slug: parsed.data.slug || slugify(parsed.data.name),
      description: parsed.data.description || null,
      isActive: parsed.data.isActive ?? true,
      sortOrder: parsed.data.sortOrder ?? 100,
    },
  });

  return success(
    { category: serializeExpenseCategory(created) },
    'Expense category created.',
    201
  );
}
