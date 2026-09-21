import { requirePermission } from '@/lib/auth/authorize';
import { rejectIfCsrfInvalid } from '@/lib/auth/http';
import type { PermissionAction } from '@/lib/auth/rbac-matrix';

export async function checkAdminAuth(
  request: Request,
  action: PermissionAction = 'manage'
) {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method.toUpperCase())) {
    const csrfError = rejectIfCsrfInvalid(request);
    if (csrfError) return { ok: false as const, error: csrfError };
  }
  return requirePermission(request, 'church', action);
}
