import { db } from '@/lib/db';
import type { AnnouncementAudience, AppNotificationType, NotificationChannel } from '@prisma/client';
import { allowsChannel, getOrCreatePreferences, resolveAudienceUserIds } from './audience';
import { communicationBackoffMs } from './backoff';
import { sendTemplatedNotificationEmail } from './email';
import { emitCommunicationEvent } from './events';
import { getChannelProvider, smsProvider } from './providers';
import { parseJobPayload, sanitizeNotificationData, sanitizeRelatedUrl } from './sanitize';
import { sanitizePlainText } from '@/lib/content/sanitize';

export { communicationBackoffMs } from './backoff';

export type NotificationChannelName = 'in_app' | 'email' | 'telegram' | 'sms';

export type SendNotificationInput = {
  userId: string;
  type: AppNotificationType;
  title: string;
  message: string;
  relatedUrl?: string | null;
  data?: Record<string, unknown>;
  channels?: NotificationChannelName[];
  transactional?: boolean;
  idempotencyKey?: string;
  expiresAt?: Date | null;
  jobId?: string | null;
  createdById?: string | null;
};

async function recordDelivery(input: {
  notificationId?: string | null;
  jobId?: string | null;
  userId: string;
  channel: NotificationChannel;
  status: 'sent' | 'failed';
  idempotencyKey: string;
  createdById?: string | null;
  providerReference?: string | null;
  errorCode?: string | null;
}) {
  await db.notificationDelivery.create({
    data: {
      notificationId: input.notificationId || null,
      jobId: input.jobId || null,
      userId: input.userId,
      channel: input.channel,
      status: input.status,
      providerReference: input.providerReference ?? null,
      errorCode: input.errorCode ?? null,
      sentAt: input.status === 'sent' ? new Date() : null,
      deliveredAt: input.status === 'sent' && input.channel === 'in_app' ? new Date() : null,
      failedAt: input.status === 'failed' ? new Date() : null,
      attemptCount: 1,
      idempotencyKey: input.idempotencyKey,
      createdById: input.createdById || null,
    },
  });
}

export async function sendNotification(input: SendNotificationInput) {
  if (input.idempotencyKey) {
    const existing = await db.appNotification.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
    });
    if (existing) return { notification: existing, created: false };
  }

  const prefs = await getOrCreatePreferences(input.userId);
  const transactional = Boolean(input.transactional);
  const channels = input.channels || ['in_app'];
  const title = sanitizePlainText(input.title, 160);
  const message = sanitizePlainText(input.message, 1000);
  const relatedUrl = sanitizeRelatedUrl(input.relatedUrl);
  const data = sanitizeNotificationData(input.data);

  let notification = null as Awaited<ReturnType<typeof db.appNotification.create>> | null;

  if (channels.includes('in_app') && allowsChannel(prefs, input.type, 'in_app', transactional)) {
    notification = await db.appNotification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title,
        message,
        data,
        relatedUrl,
        expiresAt: input.expiresAt || null,
        idempotencyKey: input.idempotencyKey || null,
      },
    });

    await recordDelivery({
      notificationId: notification.id,
      jobId: input.jobId,
      userId: input.userId,
      channel: 'in_app',
      status: 'sent',
      idempotencyKey: `in_app:${input.idempotencyKey || notification.id}`,
      createdById: input.createdById,
    });
  }

  if (channels.includes('email') && allowsChannel(prefs, input.type, 'email', transactional)) {
    const user = await db.user.findUnique({
      where: { id: input.userId },
      select: { email: true },
    });
    const deliveryKey = `email:${input.idempotencyKey || `${input.userId}:${title}:${Date.now()}`}`;
    const existingDelivery = await db.notificationDelivery.findUnique({
      where: { idempotencyKey: deliveryKey },
    });
    if (!existingDelivery && user?.email) {
      try {
        const template =
          input.type === 'event_reminder'
            ? 'event_reminder'
            : input.type === 'membership_update'
              ? 'membership_update'
              : input.type === 'giving_notification'
                ? 'giving_receipt'
                : input.type === 'announcement'
                  ? 'announcement'
                  : 'general';
        await sendTemplatedNotificationEmail({
          to: user.email,
          template,
          title,
          message,
          ctaUrl: relatedUrl,
        });
        await recordDelivery({
          notificationId: notification?.id,
          jobId: input.jobId,
          userId: input.userId,
          channel: 'email',
          status: 'sent',
          idempotencyKey: deliveryKey,
          createdById: input.createdById,
        });
      } catch {
        await recordDelivery({
          notificationId: notification?.id,
          jobId: input.jobId,
          userId: input.userId,
          channel: 'email',
          status: 'failed',
          idempotencyKey: deliveryKey,
          createdById: input.createdById,
          errorCode: 'send_failed',
        });
      }
    }
  }

  if (channels.includes('sms') && allowsChannel(prefs, input.type, 'sms', transactional)) {
    const deliveryKey = `sms:${input.idempotencyKey || `${input.userId}:${title}:${Date.now()}`}`;
    const existingDelivery = await db.notificationDelivery.findUnique({
      where: { idempotencyKey: deliveryKey },
    });
    if (!existingDelivery) {
      if (!smsProvider.configured) {
        // Skip — do not record fake success when SMS is not configured.
      } else {
        const user = await db.user.findUnique({
          where: { id: input.userId },
          select: { phone: true },
        });
        if (user?.phone) {
          const result = await smsProvider.publish({
            title,
            message,
            url: relatedUrl,
            to: user.phone,
          });
          await recordDelivery({
            notificationId: notification?.id,
            jobId: input.jobId,
            userId: input.userId,
            channel: 'sms',
            status: result.ok ? 'sent' : 'failed',
            idempotencyKey: deliveryKey,
            createdById: input.createdById,
            providerReference: result.ok ? result.providerReference : null,
            errorCode: result.ok ? null : result.errorCode,
          });
        }
      }
    }
  }

  // Per-user Telegram requires a user chat mapping — broadcast Telegram is handled at job level.
  if (channels.includes('telegram') && allowsChannel(prefs, input.type, 'telegram', transactional)) {
    // No per-user Telegram destination in schema; skip without recording delivery.
  }

  return { notification, created: true };
}

export async function enqueueCommunicationJob(input: {
  type: string;
  audience: AnnouncementAudience;
  ministryId?: string | null;
  eventId?: string | null;
  announcementId?: string | null;
  payload: Record<string, unknown>;
  channels?: string[];
  scheduledAt?: Date | null;
  idempotencyKey?: string;
  createdById?: string | null;
  priority?: string;
  templateId?: string | null;
  recurrenceRule?: string | null;
  recurrenceUntil?: Date | null;
}) {
  if (input.idempotencyKey) {
    const existing = await db.communicationJob.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
    });
    if (existing) return existing;
  }

  return db.communicationJob.create({
    data: {
      type: input.type,
      audience: input.audience,
      ministryId: input.ministryId || null,
      eventId: input.eventId || null,
      announcementId: input.announcementId || null,
      payload: JSON.stringify(input.payload),
      channels: (input.channels || ['in_app']).join(','),
      priority: input.priority || 'normal',
      templateId: input.templateId || null,
      recurrenceRule: input.recurrenceRule || null,
      recurrenceUntil: input.recurrenceUntil || null,
      scheduledAt: input.scheduledAt || null,
      status: input.scheduledAt && input.scheduledAt > new Date() ? 'pending' : 'queued',
      idempotencyKey: input.idempotencyKey || null,
      createdById: input.createdById || null,
    },
  });
}

const MAX_RECURRENCE_FOLLOW_UPS = 52;

async function maybeEnqueueRecurrenceFollowUp(job: {
  id: string;
  type: string;
  audience: AnnouncementAudience;
  ministryId: string | null;
  eventId: string | null;
  announcementId: string | null;
  payload: string;
  channels: string;
  priority: string;
  templateId: string | null;
  recurrenceRule: string | null;
  recurrenceUntil: Date | null;
  scheduledAt: Date | null;
  processedAt: Date | null;
  createdById: string | null;
}) {
  if (job.recurrenceRule !== 'weekly' || !job.recurrenceUntil) return;

  const followUpCount = await db.communicationJob.count({
    where: { idempotencyKey: { startsWith: `${job.id}:` } },
  });
  if (followUpCount >= MAX_RECURRENCE_FOLLOW_UPS) return;

  const base = job.scheduledAt ?? job.processedAt ?? new Date();
  const nextScheduled = new Date(base);
  nextScheduled.setDate(nextScheduled.getDate() + 7);
  if (nextScheduled >= job.recurrenceUntil) return;

  await enqueueCommunicationJob({
    type: job.type,
    audience: job.audience,
    ministryId: job.ministryId,
    eventId: job.eventId,
    announcementId: job.announcementId,
    payload: JSON.parse(job.payload) as Record<string, unknown>,
    channels: job.channels.split(',').map((c) => c.trim()).filter(Boolean),
    scheduledAt: nextScheduled,
    priority: job.priority,
    templateId: job.templateId,
    recurrenceRule: job.recurrenceRule,
    recurrenceUntil: job.recurrenceUntil,
    idempotencyKey: `${job.id}:${nextScheduled.toISOString()}`,
    createdById: job.createdById,
  });
}

export async function processCommunicationJobs(limit = 5) {
  const now = new Date();
  const jobs = await db.communicationJob.findMany({
    where: {
      OR: [
        { status: 'queued' },
        { status: 'pending', scheduledAt: { lte: now } },
        { status: 'failed', nextRetryAt: { lte: now }, attemptCount: { lt: 5 } },
      ],
    },
    orderBy: { createdAt: 'asc' },
    take: limit,
  });

  let processed = 0;
  for (const job of jobs) {
    await db.communicationJob.update({
      where: { id: job.id },
      data: { status: 'processing', attemptCount: { increment: 1 } },
    });

    try {
      const payload = parseJobPayload(job.payload);
      const title = String(payload.title || 'Church notice');
      const message = String(payload.message || '');
      const relatedUrl = sanitizeRelatedUrl(
        typeof payload.relatedUrl === 'string' ? payload.relatedUrl : null
      );
      const type = (payload.notificationType as AppNotificationType) || 'announcement';
      const transactional = Boolean(payload.transactional);
      const channels = job.channels.split(',').map((c) => c.trim()).filter(Boolean);
      const perUserChannels = channels.filter(
        (c): c is NotificationChannelName =>
          c === 'in_app' || c === 'email' || c === 'telegram' || c === 'sms'
      );
      const userIds =
        Array.isArray(payload.userIds) && payload.userIds.length
          ? (payload.userIds as string[])
          : await resolveAudienceUserIds({
              audience: job.audience,
              ministryId: job.ministryId,
              eventId: job.eventId,
              householdId:
                typeof payload.householdId === 'string' ? payload.householdId : undefined,
            });

      for (const userId of userIds.slice(0, 2000)) {
        await sendNotification({
          userId,
          type,
          title,
          message,
          relatedUrl,
          transactional,
          channels: perUserChannels,
          idempotencyKey: `${job.id}:${userId}`,
          jobId: job.id,
          createdById: job.createdById,
          data:
            typeof payload.data === 'object' && payload.data
              ? (payload.data as Record<string, unknown>)
              : undefined,
        });
      }

      for (const channel of channels) {
        if (channel === 'telegram' || channel === 'social' || channel === 'sms') {
          const provider = getChannelProvider(channel);
          const result = await provider.publish({ title, message, url: relatedUrl });
          await db.notificationDelivery.create({
            data: {
              jobId: job.id,
              channel: channel as NotificationChannel,
              status: result.ok ? 'sent' : 'failed',
              providerReference: result.ok ? result.providerReference : null,
              errorCode: result.ok ? null : result.errorCode,
              sentAt: result.ok ? new Date() : null,
              failedAt: result.ok ? null : new Date(),
              attemptCount: 1,
              idempotencyKey: `${channel}:${job.id}`,
              createdById: job.createdById,
            },
          });
          if (channel === 'telegram') {
            await emitCommunicationEvent({
              type: 'communications.telegram_publish',
              entityId: job.id,
              userId: job.createdById,
              details: { ok: result.ok },
            });
          }
        }
      }

      const processedAt = new Date();
      await db.communicationJob.update({
        where: { id: job.id },
        data: {
          status: 'completed',
          processedAt,
          lastError: null,
          nextRetryAt: null,
        },
      });

      await maybeEnqueueRecurrenceFollowUp({ ...job, processedAt });

      processed += 1;
      await emitCommunicationEvent({
        type: 'communications.job_processed',
        entityId: job.id,
        details: { recipients: userIds.length },
      });
    } catch (error) {
      const attempt = job.attemptCount + 1;
      const permanent = attempt >= job.maxAttempts;
      await db.communicationJob.update({
        where: { id: job.id },
        data: {
          status: 'failed',
          lastError: error instanceof Error ? error.message.slice(0, 200) : 'job_failed',
          nextRetryAt: permanent ? null : new Date(Date.now() + communicationBackoffMs(attempt)),
        },
      });
      await emitCommunicationEvent({
        type: 'communications.notification_retry',
        entityId: job.id,
        details: { attempt, permanent },
      });
    }
  }

  return { processed, scanned: jobs.length };
}

/** Fan-out from domain events (membership, giving, attendance, etc.). */
export async function notifyFromChurchEvent(input: {
  type: string;
  userId?: string | null;
  entityId?: string | null;
  title: string;
  message: string;
  relatedUrl?: string | null;
  notificationType: AppNotificationType;
  transactional?: boolean;
  channels?: NotificationChannelName[];
}) {
  if (!input.userId) return;
  await sendNotification({
    userId: input.userId,
    type: input.notificationType,
    title: input.title,
    message: input.message,
    relatedUrl: input.relatedUrl,
    transactional: input.transactional,
    channels: input.channels || ['in_app', 'email'],
    idempotencyKey: `${input.type}:${input.entityId || 'x'}:${input.userId}`,
  });
}
