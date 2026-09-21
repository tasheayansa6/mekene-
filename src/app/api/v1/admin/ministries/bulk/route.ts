import { db } from '@/lib/db';
import { forbidden, success, validationError } from '@/lib/api/response';
import { getClientIp, logSecurityEvent } from '@/lib/auth/audit';
import { hasPermission } from '@/lib/auth/permissions';
import { readJson } from '@/lib/auth/http';
import {
  canChangeMinistryStatus,
  canMutateMinistry,
} from '@/lib/admin/ministry-scope';
import { guardAdminWrite } from '@/lib/admin/guard';
import { bulkActionSchema, formatZodErrors } from '@/lib/admin/validation';

export async function POST(request: Request) {
  const auth = await guardAdminWrite(request, 'ministries', 'update');
  if (!auth.ok) return auth.error;

  const parsed = bulkActionSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const { action, ids } = parsed.data;
  if (action === 'delete' && !hasPermission(auth.user, 'ministries', 'delete')) {
    return forbidden();
  }
  if (
    ['publish', 'unpublish', 'archive', 'activate', 'deactivate'].includes(action) &&
    !canChangeMinistryStatus(auth.user)
  ) {
    return forbidden();
  }

  const ministries = await db.ministry.findMany({ where: { id: { in: ids } } });
  const allowed = ministries.filter((ministry) => canMutateMinistry(auth.user, ministry));
  if (allowed.length === 0) return forbidden();

  const allowedIds = allowed.map((item) => item.id);
  const dataByAction: Record<string, { status?: 'draft' | 'published' | 'archived'; isActive?: boolean }> = {
    activate: { isActive: true },
    deactivate: { isActive: false },
    archive: { status: 'archived', isActive: false },
    publish: { status: 'published', isActive: true },
    unpublish: { status: 'draft' },
  };

  if (action === 'delete') {
    await db.ministry.deleteMany({ where: { id: { in: allowedIds } } });
  } else {
    await db.ministry.updateMany({
      where: { id: { in: allowedIds } },
      data: dataByAction[action],
    });
  }

  await logSecurityEvent({
    action,
    entity: 'ministry',
    userId: auth.user.id,
    ipAddress: getClientIp(request),
    details: { ids: allowedIds, count: allowedIds.length },
  });

  return success({ updated: allowedIds.length }, 'Bulk action completed.');
}
