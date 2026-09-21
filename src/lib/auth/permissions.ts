import type { PermissionAction, PermissionResource } from './rbac-matrix';
import { ADMIN_PORTAL_ROLES, PRIVILEGED_ROLE_SLUGS } from './config';

export interface PermissionRef {
  resource: string;
  action: string;
}

export interface RoleRef {
  id: string;
  slug: string;
  name: string;
  hierarchy: number;
  isPrivileged: boolean;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  profileImage: string | null;
  status: string;
  isVerified: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  role: RoleRef;
  permissions: PermissionRef[];
}

export function hasPermission(
  user: { role: { slug: string }; permissions: PermissionRef[] },
  resource: PermissionResource | string,
  action: PermissionAction | string
): boolean {
  if (user.role.slug === 'super_admin') return true;
  return user.permissions.some((permission) => {
    if (permission.resource !== resource) return false;
    return permission.action === action || permission.action === 'manage';
  });
}

/**
 * UX helper: can("ministries.update") / can("users:manage").
 * Frontend checks are not authorization — the API still enforces RBAC.
 */
export function can(
  user: { role: { slug: string }; permissions: PermissionRef[] } | null | undefined,
  key: string
): boolean {
  if (!user) return false;
  const normalized = key.replace(':', '.');
  const [resource, action] = normalized.split('.');
  if (!resource || !action) return false;
  return hasPermission(user, resource, action);
}

export function canAccessAdminPortal(user: {
  role: { slug: string };
}): boolean {
  if (user.role.slug === 'member') return false;
  return ADMIN_PORTAL_ROLES.includes(user.role.slug as (typeof ADMIN_PORTAL_ROLES)[number]);
}

export function isPrivilegedRole(slug: string): boolean {
  return (PRIVILEGED_ROLE_SLUGS as readonly string[]).includes(slug);
}

/**
 * Whether actor may assign `targetSlug` to another user.
 * Super Administrators may assign any role.
 * Administrators may not assign Super Administrator or Administrator.
 * Nobody may self-elevate (enforced by caller comparing user ids).
 */
export function canAssignRole(actor: Pick<AuthUser, 'role'>, targetSlug: string): boolean {
  if (actor.role.slug === 'super_admin') return true;
  if (actor.role.slug !== 'admin') return false;
  if (targetSlug === 'super_admin' || targetSlug === 'admin') return false;
  return true;
}

export function canManageUser(
  actor: Pick<AuthUser, 'id' | 'role'>,
  target: { id: string; roleSlug: string }
): boolean {
  if (actor.role.slug === 'super_admin') return true;
  if (target.roleSlug === 'super_admin') return false;
  if (actor.role.slug === 'admin') {
    if (target.roleSlug === 'admin' && actor.id !== target.id) {
      return false;
    }
    return true;
  }
  return false;
}

export function canChangeStatus(actor: Pick<AuthUser, 'id' | 'role'>, targetUserId: string): boolean {
  if (actor.id === targetUserId && actor.role.slug !== 'super_admin') {
    return false;
  }
  return actor.role.slug === 'super_admin' || actor.role.slug === 'admin';
}
