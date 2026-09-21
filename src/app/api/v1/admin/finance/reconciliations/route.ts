import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { error, forbidden, paginated, success, validationError } from '@/lib/api/response';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { formatZodErrors } from '@/lib/auth/validation';
import { readJson } from '@/lib/auth/http';
import { canReconcile, canViewFinance } from '@/lib/finance/access';
import { serializeReconciliation } from '@/lib/finance/serialize';
import {
  reconciliationCreateSchema,
  reconciliationListQuerySchema,
} from '@/lib/finance/validation';
import { createReconciliation, reconciliationInclude } from '@/lib/finance/write';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'finance', 'view');
  if (!auth.ok) return auth.error;
  if (!canViewFinance(auth.user)) return forbidden();

  const url = new URL(request.url);
  const parsed = reconciliationListQuerySchema.safeParse({
    status: url.searchParams.get('status') || undefined,
    page: url.searchParams.get('page') || 1,
    pageSize: url.searchParams.get('pageSize') || 20,
  });
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const { status, page, pageSize } = parsed.data;
  const where: Prisma.ReconciliationWhereInput = status ? { status } : {};

  const [totalItems, rows] = await Promise.all([
    db.reconciliation.count({ where }),
    db.reconciliation.findMany({
      where,
      include: reconciliationInclude,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return paginated(rows.map(serializeReconciliation), { page, pageSize, totalItems });
}

export async function POST(request: Request) {
  const auth = await guardAdminWrite(request, 'finance', 'manage');
  if (!auth.ok) return auth.error;
  if (!canReconcile(auth.user)) return forbidden();

  const parsed = reconciliationCreateSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const result = await createReconciliation({
    ...parsed.data,
    actor: auth.user,
    request,
  });
  if (!result.ok) return error(result.error, (result.status as 400 | 403) || 400);

  return success(
    { reconciliation: serializeReconciliation(result.reconciliation) },
    'Reconciliation created.',
    201
  );
}
