import { db } from '@/lib/db';
import { success } from '@/lib/api/response';
import { requirePermission } from '@/lib/auth/authorize';

export async function GET(request: Request) {
  const auth = await requirePermission(request, 'permissions', 'view');
  if (!auth.ok) return auth.error;

  const permissions = await db.permission.findMany({
    orderBy: [{ resource: 'asc' }, { action: 'asc' }],
  });

  return success({
    permissions: permissions.map((permission) => ({
      id: permission.id,
      resource: permission.resource,
      action: permission.action,
      description: permission.description,
    })),
  });
}
