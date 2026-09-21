import { db } from '@/lib/db';
import { forbidden, success, validationError } from '@/lib/api/response';
import { getClientIp, logSecurityEvent } from '@/lib/auth/audit';
import { hasPermission } from '@/lib/auth/permissions';
import { readJson } from '@/lib/auth/http';
import { guardAdminWrite } from '@/lib/admin/guard';
import { bulkActionSchema, formatZodErrors } from '@/lib/admin/validation';

export async function POST(request: Request) {
  const auth = await guardAdminWrite(request, 'leadership', 'update');
  if (!auth.ok) return auth.error;

  const parsed = bulkActionSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const { action, ids } = parsed.data;
  if (action === 'delete' && !hasPermission(auth.user, 'leadership', 'delete')) {
    return forbidden();
  }

  const dataByAction: Record<string, { status?: 'draft' | 'published' | 'archived'; isActive?: boolean }> = {
    activate: { isActive: true },
    deactivate: { isActive: false },
    archive: { status: 'archived', isActive: false },
    publish: { status: 'published', isActive: true },
    unpublish: { status: 'draft' },
  };

  if (action === 'delete') {
    await db.leader.deleteMany({ where: { id: { in: ids } } });
  } else {
    await db.leader.updateMany({
      where: { id: { in: ids } },
      data: dataByAction[action],
    });
  }

  await logSecurityEvent({
    action,
    entity: 'leader',
    userId: auth.user.id,
    ipAddress: getClientIp(request),
    details: { ids, count: ids.length },
  });

  return success({ updated: ids.length }, 'Bulk action completed.');
}
