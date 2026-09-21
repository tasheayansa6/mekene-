import { db } from '@/lib/db';
import { paginated, validationError } from '@/lib/api/response';
import { describeActivity, parseSafeDetails } from '@/lib/admin/activity';
import { enforceAdminRateLimit, guardAdminRead } from '@/lib/admin/guard';
import { paginationSchema, formatZodErrors } from '@/lib/admin/validation';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request);
  if (!auth.ok) return auth.error;

  const limited = enforceAdminRateLimit(request, auth.user.id, 'activity');
  if (limited) return limited;

  const url = new URL(request.url);
  const parsed = paginationSchema.safeParse({
    page: url.searchParams.get('page') || 1,
    pageSize: url.searchParams.get('pageSize') || 20,
  });
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const { page, pageSize } = parsed.data;
  const isSuper = auth.user.role.slug === 'super_admin';

  const [totalItems, logs] = await Promise.all([
    db.auditLog.count(),
    db.auditLog.findMany({
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
      summary: describeActivity(log),
      details: parseSafeDetails(log.details),
      ipAddress: isSuper ? log.ipAddress : null,
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
