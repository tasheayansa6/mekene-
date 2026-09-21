import { db } from '@/lib/db';
import { error, forbidden, notFound, success, validationError } from '@/lib/api/response';
import { getClientIp, logSecurityEvent } from '@/lib/auth/audit';
import { requirePermission } from '@/lib/auth/authorize';
import { canAssignRole, canManageUser } from '@/lib/auth/permissions';
import { toAdminUserView } from '@/lib/auth/serialize';
import { adminRoleSchema, formatZodErrors } from '@/lib/auth/validation';
import { readJson, rejectIfCsrfInvalid } from '@/lib/auth/http';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const csrfError = rejectIfCsrfInvalid(request);
  if (csrfError) return csrfError;

  const auth = await requirePermission(request, 'users', 'manage');
  if (!auth.ok) return auth.error;

  const { id } = await context.params;
  const parsed = adminRoleSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return validationError(formatZodErrors(parsed.error));
  }

  if (id === auth.user.id && parsed.data.roleSlug !== auth.user.role.slug) {
    return forbidden('You cannot change your own role.');
  }

  const user = await db.user.findUnique({
    where: { id },
    include: { role: true },
  });
  if (!user) return notFound('User');

  if (!canManageUser(auth.user, { id: user.id, roleSlug: user.role.slug })) {
    return forbidden();
  }

  if (!canAssignRole(auth.user, parsed.data.roleSlug)) {
    return forbidden('You are not allowed to assign this role.');
  }

  const nextRole = await db.role.findUnique({ where: { slug: parsed.data.roleSlug } });
  if (!nextRole) return notFound('Role');

  if (user.role.slug === 'super_admin' && nextRole.slug !== 'super_admin') {
    const remaining = await db.user.count({
      where: {
        id: { not: user.id },
        status: 'active',
        role: { slug: 'super_admin' },
      },
    });
    if (remaining < 1) {
      return error('Cannot remove the last Super Administrator.', 400);
    }
  }

  const updated = await db.user.update({
    where: { id },
    data: { roleId: nextRole.id },
    include: { role: true },
  });

  await logSecurityEvent({
    action: 'role_changed',
    entity: 'user',
    entityId: user.id,
    userId: auth.user.id,
    ipAddress: getClientIp(request),
    details: {
      from: user.role.slug,
      to: nextRole.slug,
      targetUserId: user.id,
    },
  });

  return success({ user: toAdminUserView(updated) }, 'Role updated.');
}
