import { db } from '@/lib/db';
import { notFound, success, validationError } from '@/lib/api/response';
import { getClientIp, logSecurityEvent } from '@/lib/auth/audit';
import { readJson } from '@/lib/auth/http';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { formatZodErrors, leaderWriteSchema } from '@/lib/admin/validation';

type RouteContext = { params: Promise<{ id: string }> };

const leaderInclude = { position: { select: { id: true, title: true } } } as const;

function serialize(leader: {
  id: string;
  firstName: string;
  lastName: string;
  title: string | null;
  bio: string | null;
  photoUrl: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  isActive: boolean;
  sortOrder: number;
  positionId: string | null;
  createdAt: Date;
  updatedAt: Date;
  position?: { id: string; title: string } | null;
}) {
  return {
    ...leader,
    createdAt: leader.createdAt.toISOString(),
    updatedAt: leader.updatedAt.toISOString(),
  };
}

export async function GET(request: Request, context: RouteContext) {
  const auth = await guardAdminRead(request, 'leadership', 'view');
  if (!auth.ok) return auth.error;
  const { id } = await context.params;
  const leader = await db.leader.findUnique({ where: { id }, include: leaderInclude });
  if (!leader) return notFound('Leader');
  return success(serialize(leader));
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await guardAdminWrite(request, 'leadership', 'update');
  if (!auth.ok) return auth.error;
  const { id } = await context.params;
  const parsed = leaderWriteSchema.partial().safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const existing = await db.leader.findUnique({ where: { id } });
  if (!existing) return notFound('Leader');

  const data = parsed.data;
  const updated = await db.leader.update({
    where: { id },
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      slug: data.slug === undefined ? undefined : data.slug,
      title: data.title === undefined ? undefined : data.title,
      bio: data.bio === undefined ? undefined : data.bio,
      photoUrl: data.photoUrl === undefined ? undefined : data.photoUrl || null,
      email: data.email === undefined ? undefined : data.email || null,
      phone: data.phone === undefined ? undefined : data.phone,
      status: data.status,
      isActive: data.isActive,
      sortOrder: data.sortOrder,
      positionId: data.positionId === undefined ? undefined : data.positionId,
    },
    include: leaderInclude,
  });

  let action = 'update';
  if (data.status === 'published' && existing.status !== 'published') action = 'publish';
  if (data.status === 'draft' && existing.status === 'published') action = 'unpublish';
  if (data.status === 'archived') action = 'archive';
  if (data.isActive === false && existing.isActive) action = 'deactivate';
  if (data.isActive === true && !existing.isActive) action = 'activate';

  await logSecurityEvent({
    action,
    entity: 'leader',
    entityId: id,
    userId: auth.user.id,
    ipAddress: getClientIp(request),
    details: { name: `${updated.firstName} ${updated.lastName}` },
  });

  return success(serialize(updated), 'Leader updated successfully.');
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await guardAdminWrite(request, 'leadership', 'delete');
  if (!auth.ok) return auth.error;
  const { id } = await context.params;
  const existing = await db.leader.findUnique({ where: { id } });
  if (!existing) return notFound('Leader');

  await db.leader.delete({ where: { id } });
  await logSecurityEvent({
    action: 'delete',
    entity: 'leader',
    entityId: id,
    userId: auth.user.id,
    ipAddress: getClientIp(request),
    details: { name: `${existing.firstName} ${existing.lastName}` },
  });
  return success(null, 'Leader deleted.');
}
