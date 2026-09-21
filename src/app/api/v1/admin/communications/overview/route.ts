import { db } from '@/lib/db';
import { forbidden, success } from '@/lib/api/response';
import { guardAdminRead } from '@/lib/admin/guard';
import { canViewCommunications } from '@/lib/communications/access';
import {
  emailChannelProvider,
  smsProvider,
  telegramProvider,
} from '@/lib/communications/providers';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'communications', 'view');
  if (!auth.ok) return auth.error;
  if (!canViewCommunications(auth.user)) return forbidden();

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);

  const [
    unreadInApp,
    jobsPending,
    jobsScheduled,
    deliveriesFailed7d,
    deliveriesSent7d,
    failed,
    pending,
    templatesCount,
    openConversations,
    recentJobs,
  ] = await Promise.all([
    db.appNotification.count({ where: { readAt: null } }),
    db.communicationJob.count({
      where: { status: { in: ['pending', 'queued', 'processing'] } },
    }),
    db.communicationJob.count({
      where: {
        status: 'pending',
        scheduledAt: { gt: now },
      },
    }),
    db.notificationDelivery.count({
      where: { status: 'failed', createdAt: { gte: sevenDaysAgo } },
    }),
    db.notificationDelivery.count({
      where: {
        status: { in: ['sent', 'delivered'] },
        createdAt: { gte: sevenDaysAgo },
      },
    }),
    db.notificationDelivery.count({ where: { status: 'failed' } }),
    db.notificationDelivery.count({
      where: { status: { in: ['pending', 'queued'] } },
    }),
    db.communicationTemplate.count({ where: { isActive: true } }),
    db.conversation.count({
      where: {
        kind: 'support',
        archivedAt: null,
      },
    }),
    db.communicationJob.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        type: true,
        status: true,
        audience: true,
        channels: true,
        priority: true,
        lastError: true,
        createdAt: true,
      },
    }),
  ]);

  return success({
    metrics: {
      unreadInApp,
      jobsPending,
      jobsScheduled,
      deliveriesFailed7d,
      deliveriesSent7d,
      failed,
      pending,
    },
    recentJobs: recentJobs.map((job) => ({
      id: job.id,
      type: job.type,
      status: job.status,
      audience: job.audience,
      channels: job.channels,
      priority: job.priority,
      lastError: job.lastError,
      createdAt: job.createdAt.toISOString(),
    })),
    integrations: {
      telegram: {
        configured: telegramProvider.configured,
        displayName: telegramProvider.displayName,
      },
      sms: {
        configured: smsProvider.configured,
        displayName: smsProvider.displayName,
      },
      email: {
        configured: emailChannelProvider.configured,
        displayName: emailChannelProvider.displayName,
      },
    },
    templatesCount,
    openConversations,
  });
}
