import { error, forbidden, success, validationError } from '@/lib/api/response';
import { guardAdminWrite } from '@/lib/admin/guard';
import { formatZodErrors } from '@/lib/auth/validation';
import { readJson } from '@/lib/auth/http';
import { canReconcile } from '@/lib/finance/access';
import { serializeReconciliation } from '@/lib/finance/serialize';
import { reconciliationPatchSchema } from '@/lib/finance/validation';
import { updateReconciliation } from '@/lib/finance/write';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const auth = await guardAdminWrite(request, 'finance', 'manage');
  if (!auth.ok) return auth.error;
  if (!canReconcile(auth.user)) return forbidden();

  const { id } = await params;
  const parsed = reconciliationPatchSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  try {
    const result = await updateReconciliation({
      reconciliationId: id,
      actor: auth.user,
      ...parsed.data,
      request,
    });
    if (!result.ok) return error(result.error, (result.status as 400 | 403 | 404) || 400);
    return success(
      { reconciliation: serializeReconciliation(result.reconciliation) },
      'Reconciliation updated.'
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Reconciliation update failed.';
    return error(message, 400);
  }
}
