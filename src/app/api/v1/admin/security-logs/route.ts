import { db } from '@/lib/db';
import { paginated, validationError } from '@/lib/api/response';
import { requireSuperAdmin } from '@/lib/auth/authorize';
import { z } from 'zod';
import { formatZodErrors } from '@/lib/auth/validation';

const schema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  action: z.string().optional(),
});

export async function GET(request: Request) {
  const auth = await requireSuperAdmin(request);
  if (!auth.ok) return auth.error;

  const url = new URL(request.url);
  const parsed = schema.safeParse({
    page: url.searchParams.get('page') || 1,
    pageSize: url.searchParams.get('pageSize') || 25,
    action: url.searchParams.get('action') || undefined,
  });
  if (!parsed.success) {
    return validationError(formatZodErrors(parsed.error));
  }

  const { page, pageSize, action } = parsed.data;
  const where = action ? { action: { contains: action } } : {};

  const [totalItems, logs] = await Promise.all([
    db.auditLog.count({ where }),
    db.auditLog.findMany({
      where,
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return paginated(
    logs.map((log) => ({
      id: log.id,
      action: log.action,
      entity: log.entity,
      entityId: log.entityId,
      details: log.details,
      ipAddress: log.ipAddress,
      createdAt: log.createdAt.toISOString(),
      user: log.user
        ? {
            id: log.user.id,
            email: log.user.email,
            name: `${log.user.firstName} ${log.user.lastName}`,
          }
        : null,
    })),
    { page, pageSize, totalItems }
  );
}
