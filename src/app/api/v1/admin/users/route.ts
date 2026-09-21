import { db } from '@/lib/db';
import { error, forbidden, paginated, success, validationError } from '@/lib/api/response';
import { requirePermission } from '@/lib/auth/authorize';
import { toAdminUserView } from '@/lib/auth/serialize';
import { adminUserListSchema, formatZodErrors } from '@/lib/auth/validation';
import { adminCreateUserSchema } from '@/lib/admin/validation';
import { hashPassword, validatePasswordPolicy } from '@/lib/auth/password';
import { canAssignRole } from '@/lib/auth/permissions';
import { getClientIp, logSecurityEvent } from '@/lib/auth/audit';
import { readJson, rejectIfCsrfInvalid } from '@/lib/auth/http';

export async function GET(request: Request) {
  const auth = await requirePermission(request, 'users', 'view');
  if (!auth.ok) return auth.error;

  const url = new URL(request.url);
  const parsed = adminUserListSchema.safeParse({
    q: url.searchParams.get('q') || undefined,
    role: url.searchParams.get('role') || undefined,
    status: url.searchParams.get('status') || undefined,
    verified: url.searchParams.get('verified') || undefined,
    page: url.searchParams.get('page') || 1,
    pageSize: url.searchParams.get('pageSize') || 20,
  });

  if (!parsed.success) {
    return validationError(formatZodErrors(parsed.error));
  }

  const { q, role, status, verified, page, pageSize } = parsed.data;
  const where: Record<string, unknown> = {};

  if (q) {
    where.OR = [
      { email: { contains: q } },
      { firstName: { contains: q } },
      { lastName: { contains: q } },
      { phone: { contains: q } },
    ];
  }
  if (status) where.status = status;
  if (verified === 'true') where.isVerified = true;
  if (verified === 'false') where.isVerified = false;
  if (role) where.role = { slug: role };

  if (auth.user.role.slug !== 'super_admin') {
    where.NOT = { role: { slug: 'super_admin' } };
  }

  const [totalItems, users] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      include: { role: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const data = users.map((user) => toAdminUserView(user));

  return paginated(data, { page, pageSize, totalItems });
}

export async function POST(request: Request) {
  const csrfError = rejectIfCsrfInvalid(request);
  if (csrfError) return csrfError;

  const auth = await requirePermission(request, 'users', 'create');
  if (!auth.ok) return auth.error;

  const parsed = adminCreateUserSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const data = parsed.data;
  if (!canAssignRole(auth.user, data.roleSlug)) {
    return forbidden('You are not allowed to assign this role.');
  }

  const policy = validatePasswordPolicy(data.password, {
    email: data.email,
    firstName: data.firstName,
    lastName: data.lastName,
  });
  if (!policy.ok) {
    return validationError({ password: policy.errors });
  }

  const existing = await db.user.findUnique({ where: { email: data.email } });
  if (existing) {
    return error('That email address is not available.', 409);
  }

  const role = await db.role.findUnique({ where: { slug: data.roleSlug } });
  if (!role) return error('Role not found.', 404);

  const user = await db.user.create({
    data: {
      email: data.email,
      passwordHash: await hashPassword(data.password),
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone || null,
      status: 'active',
      isVerified: true,
      roleId: role.id,
    },
    include: { role: true },
  });

  await logSecurityEvent({
    action: 'user_created',
    entity: 'user',
    entityId: user.id,
    userId: auth.user.id,
    ipAddress: getClientIp(request),
    details: { email: user.email, role: role.slug },
  });

  return success({ user: toAdminUserView(user) }, 'User created.', 201);
}
