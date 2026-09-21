import { db } from '@/lib/db';
import { forbidden, notFound, success, validationError } from '@/lib/api/response';
import { getClientIp, logSecurityEvent } from '@/lib/auth/audit';
import { requirePermission, requireSuperAdmin } from '@/lib/auth/authorize';
import { adminRolePermissionsSchema, formatZodErrors } from '@/lib/auth/validation';
import { readJson, rejectIfCsrfInvalid } from '@/lib/auth/http';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const auth = await requirePermission(request, 'roles', 'view');
  if (!auth.ok) return auth.error;

  const { id } = await context.params;
  const role = await db.role.findUnique({
    where: { id },
    include: {
      permissions: { include: { permission: true } },
      _count: { select: { users: true } },
    },
  });
  if (!role) return notFound('Role');

  return success({
    role: {
      id: role.id,
      slug: role.slug,
      name: role.name,
      description: role.description,
      hierarchy: role.hierarchy,
      isSystem: role.isSystem,
      isPrivileged: role.isPrivileged,
      userCount: role._count.users,
      permissions: role.permissions.map((rp) => ({
        id: rp.permission.id,
        resource: rp.permission.resource,
        action: rp.permission.action,
        description: rp.permission.description,
      })),
    },
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const csrfError = rejectIfCsrfInvalid(request);
  if (csrfError) return csrfError;

  const auth = await requireSuperAdmin(request);
  if (!auth.ok) return auth.error;

  const { id } = await context.params;
  const role = await db.role.findUnique({ where: { id } });
  if (!role) return notFound('Role');

  if (role.slug === 'super_admin') {
    return forbidden('The Super Administrator role cannot be modified.');
  }

  const parsed = adminRolePermissionsSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return validationError(formatZodErrors(parsed.error));
  }

  await db.$transaction([
    db.rolePermission.deleteMany({ where: { roleId: role.id } }),
    db.rolePermission.createMany({
      data: parsed.data.permissionIds.map((permissionId) => ({
        roleId: role.id,
        permissionId,
      })),
    }),
  ]);

  await logSecurityEvent({
    action: 'role_permissions_changed',
    entity: 'role',
    entityId: role.id,
    userId: auth.user.id,
    ipAddress: getClientIp(request),
    details: { slug: role.slug, permissionCount: parsed.data.permissionIds.length },
  });

  const updated = await db.role.findUnique({
    where: { id },
    include: { permissions: { include: { permission: true } } },
  });

  return success(
    {
      role: {
        id: updated!.id,
        slug: updated!.slug,
        name: updated!.name,
        permissions: updated!.permissions.map((rp) => ({
          id: rp.permission.id,
          resource: rp.permission.resource,
          action: rp.permission.action,
        })),
      },
    },
    'Role permissions updated.'
  );
}
