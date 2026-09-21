import { rejectIfCsrfInvalid } from '@/lib/auth/http';
import { requireAdminPortal } from '@/lib/auth/authorize';
import { forbidden } from '@/lib/api/response';
import { hasPermission } from '@/lib/auth/permissions';
import type { PermissionAction } from '@/lib/auth/rbac-matrix';

/** Admin prayer APIs require the admin portal AND an explicit prayer permission. */
export async function guardPrayerAdminRead(
  request: Request,
  action: PermissionAction | string = 'view'
) {
  const auth = await requireAdminPortal(request);
  if (!auth.ok) return auth;
  if (!hasPermission(auth.user, 'prayer', action)) {
    return { ok: false as const, error: forbidden() };
  }
  return auth;
}

export async function guardPrayerAdminWrite(
  request: Request,
  action: PermissionAction | string
) {
  const csrfError = rejectIfCsrfInvalid(request);
  if (csrfError) return { ok: false as const, error: csrfError };
  return guardPrayerAdminRead(request, action);
}
