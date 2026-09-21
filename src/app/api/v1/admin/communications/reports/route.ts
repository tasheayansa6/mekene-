import type { DeliveryStatus, NotificationChannel } from '@prisma/client';
import { db } from '@/lib/db';
import { forbidden, success, validationError } from '@/lib/api/response';
import { guardAdminRead } from '@/lib/admin/guard';
import { canViewCommunications } from '@/lib/communications/access';

function parseDate(value: string | null, fallback: Date): Date {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'communications', 'view');
  if (!auth.ok) return auth.error;
  if (!canViewCommunications(auth.user)) return forbidden();

  const url = new URL(request.url);
  const now = new Date();
  const from = parseDate(url.searchParams.get('from'), new Date(now.getTime() - 30 * 86400000));
  const to = parseDate(url.searchParams.get('to'), now);
  const channel = url.searchParams.get('channel') as NotificationChannel | null;
  const status = url.searchParams.get('status') as DeliveryStatus | null;
  const type = url.searchParams.get('type') || undefined;

  if (from > to) {
    return validationError({ from: ['from must be before to.'] });
  }

  const deliveryWhere = {
    createdAt: { gte: from, lte: to },
    ...(channel ? { channel } : {}),
    ...(status ? { status } : {}),
  };

  const jobWhere = {
    createdAt: { gte: from, lte: to },
    ...(type ? { type } : {}),
  };

  const [jobs, deliveries, byChannelRows, byStatusRows] = await Promise.all([
    db.communicationJob.count({ where: jobWhere }),
    db.notificationDelivery.findMany({
      where: deliveryWhere,
      select: { channel: true, status: true },
    }),
    db.notificationDelivery.groupBy({
      by: ['channel'],
      where: deliveryWhere,
      _count: { _all: true },
    }),
    db.notificationDelivery.groupBy({
      by: ['status'],
      where: deliveryWhere,
      _count: { _all: true },
    }),
  ]);

  const byChannel: Record<string, number> = {};
  for (const row of byChannelRows) {
    byChannel[row.channel] = row._count._all;
  }

  const byStatus: Record<string, number> = {};
  let sent = 0;
  let failed = 0;
  let pending = 0;
  for (const row of byStatusRows) {
    byStatus[row.status] = row._count._all;
  }
  for (const row of deliveries) {
    if (row.status === 'sent' || row.status === 'delivered') sent += 1;
    else if (row.status === 'failed') failed += 1;
    else if (row.status === 'pending' || row.status === 'queued') pending += 1;
  }

  return success({
    totals: {
      jobs,
      sent,
      failed,
      pending,
    },
    byChannel,
    byStatus,
  });
}
