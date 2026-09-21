import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { forbidden, paginated, validationError } from '@/lib/api/response';
import { guardAdminRead } from '@/lib/admin/guard';
import { formatZodErrors } from '@/lib/auth/validation';
import { canViewFinance } from '@/lib/finance/access';
import { serializeLedgerEntry } from '@/lib/finance/serialize';
import { ledgerListQuerySchema } from '@/lib/finance/validation';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'finance', 'view');
  if (!auth.ok) return auth.error;
  if (!canViewFinance(auth.user)) return forbidden();

  const url = new URL(request.url);
  const parsed = ledgerListQuerySchema.safeParse({
    type: url.searchParams.get('type') || undefined,
    fundId: url.searchParams.get('fundId') || undefined,
    status: url.searchParams.get('status') || undefined,
    from: url.searchParams.get('from') || undefined,
    to: url.searchParams.get('to') || undefined,
    page: url.searchParams.get('page') || 1,
    pageSize: url.searchParams.get('pageSize') || 20,
  });
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const { type, fundId, status, from, to, page, pageSize } = parsed.data;
  const and: Prisma.FinancialEntryWhereInput[] = [];
  if (type) and.push({ type });
  if (fundId) and.push({ fundId });
  if (status) and.push({ status });
  if (from) {
    const date = new Date(from);
    if (!Number.isNaN(date.getTime())) and.push({ entryDate: { gte: date } });
  }
  if (to) {
    const date = new Date(to);
    if (!Number.isNaN(date.getTime())) and.push({ entryDate: { lte: date } });
  }

  const where: Prisma.FinancialEntryWhereInput = and.length ? { AND: and } : {};
  const [totalItems, rows] = await Promise.all([
    db.financialEntry.count({ where }),
    db.financialEntry.findMany({
      where,
      include: {
        fund: { select: { id: true, slug: true, name: true } },
      },
      orderBy: [{ entryDate: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return paginated(rows.map(serializeLedgerEntry), { page, pageSize, totalItems });
}
