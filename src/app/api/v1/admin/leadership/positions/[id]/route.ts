import { db } from '@/lib/db';
import { notFound, success, validationError } from '@/lib/api/response';
import { getClientIp, logSecurityEvent } from '@/lib/auth/audit';
import { readJson } from '@/lib/auth/http';
import { guardAdminWrite } from '@/lib/admin/guard';
import { formatZodErrors, positionWriteSchema } from '@/lib/admin/validation';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await guardAdminWrite(request, 'leadership', 'update');
  if (!auth.ok) return auth.error;
  const { id } = await context.params;
  const parsed = positionWriteSchema.partial().safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const existing = await db.leadershipPosition.findUnique({ where: { id } });
  if (!existing) return notFound('Position');

  const updated = await db.leadershipPosition.update({
    where: { id },
    data: {
      title: parsed.data.title,
      description: parsed.data.description === undefined ? undefined : parsed.data.description,
      sortOrder: parsed.data.sortOrder,
      isActive: parsed.data.isActive,
    },
    include: { _count: { select: { leaders: true } } },
  });

  await logSecurityEvent({
    action: 'update',
    entity: 'leadership_position',
    entityId: id,
    userId: auth.user.id,
    ipAddress: getClientIp(request),
    details: { title: updated.title },
  });

  return success(
    {
      ...updated,
      leaderCount: updated._count.leaders,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    },
    'Position updated.'
  );
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await guardAdminWrite(request, 'leadership', 'delete');
  if (!auth.ok) return auth.error;
  const { id } = await context.params;
  const existing = await db.leadershipPosition.findUnique({ where: { id } });
  if (!existing) return notFound('Position');

  await db.leadershipPosition.delete({ where: { id } });
  await logSecurityEvent({
    action: 'delete',
    entity: 'leadership_position',
    entityId: id,
    userId: auth.user.id,
    ipAddress: getClientIp(request),
    details: { title: existing.title },
  });
  return success(null, 'Position deleted.');
}
