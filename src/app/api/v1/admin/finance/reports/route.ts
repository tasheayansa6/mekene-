import { forbidden, success, validationError } from '@/lib/api/response';
import { guardAdminRead } from '@/lib/admin/guard';
import { formatZodErrors } from '@/lib/auth/validation';
import { canViewFinance } from '@/lib/finance/access';
import { buildFinanceReport } from '@/lib/finance/reports';
import { reportQuerySchema } from '@/lib/finance/validation';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'finance', 'view');
  if (!auth.ok) return auth.error;
  if (!canViewFinance(auth.user)) return forbidden();

  const url = new URL(request.url);
  const parsed = reportQuerySchema.safeParse({
    from: url.searchParams.get('from') || undefined,
    to: url.searchParams.get('to') || undefined,
    fundId: url.searchParams.get('fundId') || undefined,
  });
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const from = parsed.data.from ? new Date(parsed.data.from) : null;
  const to = parsed.data.to ? new Date(parsed.data.to) : null;
  if (from && Number.isNaN(from.getTime())) {
    return validationError({ from: ['Invalid from date'] });
  }
  if (to && Number.isNaN(to.getTime())) {
    return validationError({ to: ['Invalid to date'] });
  }

  const report = await buildFinanceReport({
    from,
    to,
    fundId: parsed.data.fundId || null,
  });

  return success({ report });
}
