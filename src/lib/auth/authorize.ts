import { unauthorized, forbidden } from '@/lib/api/response';
import type { PermissionAction, PermissionResource } from './rbac-matrix';
import { getSessionUser } from './session';
import {
  canAccessAdminPortal,
  hasPermission,
  type AuthUser,
} from './permissions';

type AuthOk = { ok: true; user: AuthUser };
type AuthFail = {
  ok: false;
  error: ReturnType<typeof unauthorized> | ReturnType<typeof forbidden>;
};
export type AuthResult = AuthOk | AuthFail;

export async function requireAuth(request: Request): Promise<AuthResult> {
  const user = await getSessionUser(request);
  if (!user) {
    return { ok: false, error: unauthorized() };
  }

  if (user.status === 'suspended') {
    return {
      ok: false,
      error: forbidden(
        'Your account has been suspended. Please contact the church office.'
      ),
    };
  }
  if (user.status === 'deactivated') {
    return {
      ok: false,
      error: forbidden('This account has been deactivated.'),
    };
  }
  if (user.status === 'pending' || !user.isVerified) {
    return {
      ok: false,
      error: forbidden('Please verify your email address before continuing.'),
    };
  }

  return { ok: true, user };
}

/** Session if present and usable; guests allowed (returns user: null). */
export async function optionalAuth(
  request: Request
): Promise<{ user: AuthUser | null }> {
  const user = await getSessionUser(request);
  if (!user) return { user: null };
  if (
    user.status === 'suspended' ||
    user.status === 'deactivated' ||
    user.status === 'pending' ||
    !user.isVerified
  ) {
    return { user: null };
  }
  return { user };
}

export async function requireVerifiedSession(
  request: Request
): Promise<AuthResult> {
  return requireAuth(request);
}

export async function requirePermission(
  request: Request,
  resource: PermissionResource | string,
  action: PermissionAction | string
): Promise<AuthResult> {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth;
  if (!hasPermission(auth.user, resource, action)) {
    return { ok: false, error: forbidden() };
  }
  return auth;
}

export async function requireAdminPortal(request: Request): Promise<AuthResult> {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth;
  if (!canAccessAdminPortal(auth.user)) {
    return { ok: false, error: forbidden() };
  }
  return auth;
}

export async function requireSuperAdmin(request: Request): Promise<AuthResult> {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth;
  if (auth.user.role.slug !== 'super_admin') {
    return { ok: false, error: forbidden() };
  }
  return auth;
}
