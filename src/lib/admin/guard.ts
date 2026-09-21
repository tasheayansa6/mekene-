import { rejectIfCsrfInvalid } from '@/lib/auth/http';
import { requireAdminPortal, requirePermission } from '@/lib/auth/authorize';
import type { PermissionAction, PermissionResource } from '@/lib/auth/rbac-matrix';
import { getClientIp } from '@/lib/auth/audit';
import { rateLimitKey } from '@/lib/auth/rate-limit';
import { tooManyRequests } from '@/lib/api/response';

export async function guardAdminRead(
  request: Request,
  resource?: PermissionResource | string,
  action: PermissionAction | string = 'view'
) {
  if (resource) {
    return requirePermission(request, resource, action);
  }
  return requireAdminPortal(request);
}

export async function guardAdminWrite(
  request: Request,
  resource: PermissionResource | string,
  action: PermissionAction | string
) {
  const csrfError = rejectIfCsrfInvalid(request);
  if (csrfError) return { ok: false as const, error: csrfError };
  return requirePermission(request, resource, action);
}

export function enforceAdminRateLimit(request: Request, userId: string, bucket: string) {
  const ip = getClientIp(request);
  const result = rateLimitKey(`admin:${bucket}:${userId}:${ip}`, 90, 60_000);
  if (!result.allowed) {
    return tooManyRequests(
      'Too many requests. Please wait a moment and try again.',
      result.retryAfterSeconds
    );
  }
  return null;
}
