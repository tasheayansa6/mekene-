import { db } from '@/lib/db';
import { error, forbidden, notFound, success, validationError } from '@/lib/api/response';
import { getClientIp, logSecurityEvent } from '@/lib/auth/audit';
import { requirePermission } from '@/lib/auth/authorize';
import { canChangeStatus, canManageUser } from '@/lib/auth/permissions';
import { toAdminUserView } from '@/lib/auth/serialize';
import { revokeAllUserSessions } from '@/lib/auth/session';
import { adminStatusSchema, formatZodErrors } from '@/lib/auth/validation';
import { readJson, rejectIfCsrfInvalid } from '@/lib/auth/http';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const csrfError = rejectIfCsrfInvalid(request);
  if (csrfError) return csrfError;

  const auth = await requirePermission(request, 'users', 'manage');
  if (!auth.ok) return auth.error;

  const { id } = await context.params;
  const parsed = adminStatusSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return validationError(formatZodErrors(parsed.error));
  }

  const user = await db.user.findUnique({
    where: { id },
    include: { role: true },
  });
  if (!user) return notFound('User');

  if (!canManageUser(auth.user, { id: user.id, roleSlug: user.role.slug })) {
    return forbidden();
  }
  if (!canChangeStatus(auth.user, user.id)) {
    return forbidden('You cannot change your own account status.');
  }

  if (user.role.slug === 'super_admin' && parsed.data.status !== 'active') {
    const remaining = await db.user.count({
      where: {
        id: { not: user.id },
        status: 'active',
        role: { slug: 'super_admin' },
      },
    });
    if (remaining < 1) {
      return error('Cannot suspend or deactivate the last Super Administrator.', 400);
    }
  }

  const updated = await db.user.update({
    where: { id },
    data: { status: parsed.data.status },
    include: { role: true },
  });

  if (parsed.data.status === 'suspended' || parsed.data.status === 'deactivated') {
    await revokeAllUserSessions(user.id);
  }

  await logSecurityEvent({
    action:
      parsed.data.status === 'suspended'
        ? 'account_suspended'
        : parsed.data.status === 'deactivated'
          ? 'account_deactivated'
          : 'account_status_changed',
    entity: 'user',
    entityId: user.id,
    userId: auth.user.id,
    ipAddress: getClientIp(request),
    details: { status: parsed.data.status, targetUserId: user.id },
  });

  return success({ user: toAdminUserView(updated) }, 'Account status updated.');
}
