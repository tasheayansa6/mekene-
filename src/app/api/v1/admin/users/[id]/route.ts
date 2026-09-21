import { db } from '@/lib/db';
import { error, forbidden, notFound, success, validationError } from '@/lib/api/response';
import { requirePermission } from '@/lib/auth/authorize';
import { canManageUser } from '@/lib/auth/permissions';
import { toAdminUserView } from '@/lib/auth/serialize';
import { adminUpdateUserSchema, formatZodErrors } from '@/lib/auth/validation';
import { readJson, rejectIfCsrfInvalid } from '@/lib/auth/http';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const auth = await requirePermission(request, 'users', 'view');
  if (!auth.ok) return auth.error;

  const { id } = await context.params;
  const user = await db.user.findUnique({
    where: { id },
    include: { role: true },
  });
  if (!user) return notFound('User');

  if (user.role.slug === 'super_admin' && auth.user.role.slug !== 'super_admin') {
    return forbidden();
  }

  return success({ user: toAdminUserView(user) });
}

export async function PATCH(request: Request, context: RouteContext) {
  const csrfError = rejectIfCsrfInvalid(request);
  if (csrfError) return csrfError;

  const auth = await requirePermission(request, 'users', 'update');
  if (!auth.ok) return auth.error;

  const { id } = await context.params;
  const user = await db.user.findUnique({
    where: { id },
    include: { role: true },
  });
  if (!user) return notFound('User');

  if (!canManageUser(auth.user, { id: user.id, roleSlug: user.role.slug })) {
    return forbidden();
  }

  const parsed = adminUpdateUserSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return validationError(formatZodErrors(parsed.error));
  }

  if ('role' in (parsed.data as object) || 'status' in (parsed.data as object)) {
    return error('Use the dedicated status or role endpoints.', 400);
  }

  const updated = await db.user.update({
    where: { id },
    data: parsed.data,
    include: { role: true },
  });

  return success({ user: toAdminUserView(updated) }, 'User updated.');
}
