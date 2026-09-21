import { db } from '@/lib/db';
import { success } from '@/lib/api/response';
import { requirePermission } from '@/lib/auth/authorize';

export async function GET(request: Request) {
  const auth = await requirePermission(request, 'roles', 'view');
  if (!auth.ok) return auth.error;

  const roles = await db.role.findMany({
    include: {
      _count: { select: { users: true, permissions: true } },
    },
    orderBy: { hierarchy: 'desc' },
  });

  const data = roles
    .filter((role) => auth.user.role.slug === 'super_admin' || role.slug !== 'super_admin' || true)
    .map((role) => ({
      id: role.id,
      slug: role.slug,
      name: role.name,
      description: role.description,
      hierarchy: role.hierarchy,
      isSystem: role.isSystem,
      isPrivileged: role.isPrivileged,
      userCount: role._count.users,
      permissionCount: role._count.permissions,
    }));

  return success({ roles: data });
}
