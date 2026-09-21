import { db } from '@/lib/db';
import { forbidden, paginated, success } from '@/lib/api/response';
import { guardAdminRead } from '@/lib/admin/guard';
import { canViewCommunications } from '@/lib/communications/access';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'communications', 'view');
  if (!auth.ok) return auth.error;
  if (!canViewCommunications(auth.user)) return forbidden();

  const url = new URL(request.url);
  const status = url.searchParams.get('status') || undefined;
  const channel = url.searchParams.get('channel') || undefined;
  const page = Math.max(1, Number(url.searchParams.get('page') || 1));
  const pageSize = Math.min(50, Math.max(1, Number(url.searchParams.get('pageSize') || 20)));

  const where = {
    ...(status ? { status: status as 'pending' | 'queued' | 'sent' | 'delivered' | 'failed' | 'cancelled' } : {}),
    ...(channel
      ? { channel: channel as 'in_app' | 'email' | 'telegram' | 'social' }
      : {}),
  };

  const [totalItems, rows] = await Promise.all([
    db.notificationDelivery.count({ where }),
    db.notificationDelivery.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        channel: true,
        status: true,
        errorCode: true,
        attemptCount: true,
        sentAt: true,
        failedAt: true,
        createdAt: true,
        userId: true,
        jobId: true,
        providerReference: true,
      },
    }),
  ]);

  return paginated(
    rows.map((row) => ({
      ...row,
      sentAt: row.sentAt?.toISOString() ?? null,
      failedAt: row.failedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    })),
    { page, pageSize, totalItems }
  );
}
