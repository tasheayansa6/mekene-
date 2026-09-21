import { db } from '@/lib/db';
import { error, forbidden, notFound, success, validationError } from '@/lib/api/response';
import { getClientIp, logSecurityEvent } from '@/lib/auth/audit';
import { hasPermission } from '@/lib/auth/permissions';
import { readJson } from '@/lib/auth/http';
import {
  canChangeMinistryStatus,
  canMutateMinistry,
  canViewMinistry,
} from '@/lib/admin/ministry-scope';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { formatZodErrors, ministryWriteSchema } from '@/lib/admin/validation';

type RouteContext = { params: Promise<{ id: string }> };

function serialize(ministry: {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  leaderName: string | null;
  category: string | null;
  imageUrl: string | null;
  status: string;
  isActive: boolean;
  sortOrder: number;
  leaderUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...ministry,
    createdAt: ministry.createdAt.toISOString(),
    updatedAt: ministry.updatedAt.toISOString(),
  };
}

export async function GET(request: Request, context: RouteContext) {
  const auth = await guardAdminRead(request, 'ministries', 'view');
  if (!auth.ok) return auth.error;
  const { id } = await context.params;
  const ministry = await db.ministry.findUnique({ where: { id } });
  if (!ministry) return notFound('Ministry');
  if (!canViewMinistry(auth.user, ministry)) return forbidden();
  return success(serialize(ministry));
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await guardAdminWrite(request, 'ministries', 'update');
  if (!auth.ok) return auth.error;
  const { id } = await context.params;
  const parsed = ministryWriteSchema.partial().safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const ministry = await db.ministry.findUnique({ where: { id } });
  if (!ministry) return notFound('Ministry');
  if (!canMutateMinistry(auth.user, ministry)) return forbidden();

  const data = parsed.data;
  if (data.slug && data.slug !== ministry.slug) {
    const clash = await db.ministry.findUnique({ where: { slug: data.slug } });
    if (clash) return error('A ministry with this slug already exists.', 409);
  }

  if (
    (data.status && data.status !== ministry.status) ||
    (typeof data.isActive === 'boolean' && data.isActive !== ministry.isActive)
  ) {
    if (!canChangeMinistryStatus(auth.user)) {
      return forbidden('You cannot change the publication status of this ministry.');
    }
  }

  if (data.leaderUserId !== undefined && auth.user.role.slug === 'ministry_leader') {
    return forbidden('You cannot reassign ministry leadership.');
  }

  const updated = await db.ministry.update({
    where: { id },
    data: {
      name: data.name,
      slug: data.slug,
      description: data.description === undefined ? undefined : data.description,
      leaderName: data.leaderName === undefined ? undefined : data.leaderName,
      category: data.category === undefined ? undefined : data.category,
      imageUrl: data.imageUrl === undefined ? undefined : data.imageUrl || null,
      status: data.status,
      isActive: data.isActive,
      sortOrder: data.sortOrder,
      leaderUserId: data.leaderUserId === undefined ? undefined : data.leaderUserId,
    },
  });

  let action = 'update';
  if (data.status === 'published' && ministry.status !== 'published') action = 'publish';
  if (data.status === 'draft' && ministry.status === 'published') action = 'unpublish';
  if (data.status === 'archived') action = 'archive';

  await logSecurityEvent({
    action,
    entity: 'ministry',
    entityId: ministry.id,
    userId: auth.user.id,
    ipAddress: getClientIp(request),
    details: { name: updated.name },
  });

  return success(serialize(updated), 'Ministry updated successfully.');
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await guardAdminWrite(request, 'ministries', 'delete');
  if (!auth.ok) return auth.error;
  const { id } = await context.params;
  const ministry = await db.ministry.findUnique({ where: { id } });
  if (!ministry) return notFound('Ministry');
  if (!canMutateMinistry(auth.user, ministry) || !hasPermission(auth.user, 'ministries', 'delete')) {
    return forbidden();
  }

  await db.ministry.delete({ where: { id } });
  await logSecurityEvent({
    action: 'delete',
    entity: 'ministry',
    entityId: id,
    userId: auth.user.id,
    ipAddress: getClientIp(request),
    details: { name: ministry.name },
  });
  return success(null, 'Ministry deleted.');
}
