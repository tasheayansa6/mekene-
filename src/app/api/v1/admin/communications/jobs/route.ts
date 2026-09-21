import { db } from '@/lib/db';
import { forbidden, paginated } from '@/lib/api/response';
import { guardAdminRead } from '@/lib/admin/guard';
import { canViewCommunications } from '@/lib/communications/access';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'communications', 'view');
  if (!auth.ok) return auth.error;
  if (!canViewCommunications(auth.user)) return forbidden();

  const url = new URL(request.url);
  const status = url.searchParams.get('status') || undefined;
  const page = Math.max(1, Number(url.searchParams.get('page') || 1));
  const pageSize = Math.min(50, Math.max(1, Number(url.searchParams.get('pageSize') || 20)));

  const where = {
    ...(status
      ? {
          status: status as
            | 'pending'
            | 'queued'
            | 'processing'
            | 'completed'
            | 'failed'
            | 'cancelled',
        }
      : {}),
  };

  const [totalItems, rows] = await Promise.all([
    db.communicationJob.count({ where }),
    db.communicationJob.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        type: true,
        status: true,
        audience: true,
        channels: true,
        scheduledAt: true,
        processedAt: true,
        attemptCount: true,
        maxAttempts: true,
        lastError: true,
        createdAt: true,
      },
    }),
  ]);

  return paginated(
    rows.map((row) => ({
      ...row,
      scheduledAt: row.scheduledAt?.toISOString() ?? null,
      processedAt: row.processedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    })),
    { page, pageSize, totalItems }
  );
}
