import { db } from '@/lib/db';
import { forbidden, notFound, success } from '@/lib/api/response';
import { guardAdminRead } from '@/lib/admin/guard';
import { canViewCommunications } from '@/lib/communications/access';
import { parseJobPayload } from '@/lib/communications/sanitize';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await guardAdminRead(request, 'communications', 'view');
  if (!auth.ok) return auth.error;
  if (!canViewCommunications(auth.user)) return forbidden();

  const { id } = await context.params;
  const job = await db.communicationJob.findUnique({
    where: { id },
    select: {
      id: true,
      type: true,
      status: true,
      audience: true,
      ministryId: true,
      eventId: true,
      announcementId: true,
      channels: true,
      priority: true,
      templateId: true,
      recurrenceRule: true,
      recurrenceUntil: true,
      scheduledAt: true,
      processedAt: true,
      attemptCount: true,
      maxAttempts: true,
      lastError: true,
      createdAt: true,
      updatedAt: true,
      payload: true,
    },
  });
  if (!job) return notFound('Job');

  const [byChannelRows, byStatusRows] = await Promise.all([
    db.notificationDelivery.groupBy({
      by: ['channel'],
      where: { jobId: id },
      _count: { _all: true },
    }),
    db.notificationDelivery.groupBy({
      by: ['status'],
      where: { jobId: id },
      _count: { _all: true },
    }),
  ]);

  const byChannel: Record<string, number> = {};
  for (const row of byChannelRows) {
    byChannel[row.channel] = row._count._all;
  }

  const byStatus: Record<string, number> = {};
  for (const row of byStatusRows) {
    byStatus[row.status] = row._count._all;
  }

  let payloadSummary: { title?: string; notificationType?: string } = {};
  try {
    const payload = parseJobPayload(job.payload);
    payloadSummary = {
      title: typeof payload.title === 'string' ? payload.title : undefined,
      notificationType:
        typeof payload.notificationType === 'string' ? payload.notificationType : undefined,
    };
  } catch {
    payloadSummary = {};
  }

  return success({
    job: {
      id: job.id,
      type: job.type,
      status: job.status,
      audience: job.audience,
      ministryId: job.ministryId,
      eventId: job.eventId,
      announcementId: job.announcementId,
      channels: job.channels.split(',').map((c) => c.trim()).filter(Boolean),
      priority: job.priority,
      templateId: job.templateId,
      recurrenceRule: job.recurrenceRule,
      recurrenceUntil: job.recurrenceUntil?.toISOString() ?? null,
      scheduledAt: job.scheduledAt?.toISOString() ?? null,
      processedAt: job.processedAt?.toISOString() ?? null,
      attemptCount: job.attemptCount,
      maxAttempts: job.maxAttempts,
      lastError: job.lastError,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
      payloadSummary,
    },
    deliveryAggregates: { byChannel, byStatus },
  });
}
