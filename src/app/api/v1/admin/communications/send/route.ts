import { z } from 'zod';
import { db } from '@/lib/db';
import {
  error,
  forbidden,
  success,
  tooManyRequests,
  validationError,
} from '@/lib/api/response';
import { guardAdminWrite, enforceAdminRateLimit } from '@/lib/admin/guard';
import { formatZodErrors } from '@/lib/auth/validation';
import { readJson } from '@/lib/auth/http';
import { getClientIp } from '@/lib/auth/audit';
import { rateLimitKey } from '@/lib/auth/rate-limit';
import {
  canSendBulkCommunications,
  canSendCommunications,
  isMinistryScopedCommunicator,
} from '@/lib/communications/access';
import { enqueueCommunicationJob } from '@/lib/communications/service';
import { emitCommunicationEvent } from '@/lib/communications/events';
import { sanitizeRelatedUrl } from '@/lib/communications/sanitize';

const sendSchema = z.object({
  title: z.string().trim().min(1).max(160),
  message: z.string().trim().min(1).max(1000),
  audience: z.enum([
    'everyone',
    'members',
    'ministry',
    'ministry_leaders',
    'staff',
    'volunteers',
    'event_registrants',
  ]),
  ministryId: z.string().trim().nullable().optional(),
  eventId: z.string().trim().nullable().optional(),
  householdId: z.string().trim().nullable().optional(),
  announcementId: z.string().trim().nullable().optional(),
  relatedUrl: z.string().trim().max(500).nullable().optional(),
  channels: z
    .array(z.enum(['in_app', 'email', 'telegram', 'social', 'sms']))
    .min(1)
    .optional(),
  notificationType: z
    .enum([
      'announcement',
      'news',
      'notice',
      'event_reminder',
      'ministry_update',
      'membership_update',
      'attendance_notice',
      'giving_notification',
      'system',
    ])
    .optional(),
  priority: z.enum(['normal', 'important', 'urgent', 'emergency']).optional(),
  templateId: z.string().trim().nullable().optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
  recurrenceRule: z.enum(['weekly']).nullable().optional(),
  recurrenceUntil: z.string().datetime().nullable().optional(),
  bulk: z.boolean().optional(),
  confirm: z.boolean().optional(),
  idempotencyKey: z.string().trim().max(120).optional(),
});

export async function POST(request: Request) {
  const auth = await guardAdminWrite(request, 'communications', 'assign');
  if (!auth.ok) return auth.error;
  if (!canSendCommunications(auth.user)) return forbidden();

  const rate = enforceAdminRateLimit(request, auth.user.id, 'communications-send');
  if (rate) return rate;

  const limited = rateLimitKey(
    `communications-send:${auth.user.id}:${getClientIp(request)}`,
    20,
    60_000
  );
  if (!limited.allowed) {
    return tooManyRequests(
      'Too many send attempts. Please wait a moment and try again.',
      limited.retryAfterSeconds
    );
  }

  const parsed = sendSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const data = parsed.data;

  if (data.priority === 'emergency') {
    return error('Use the emergency endpoint for emergency broadcasts.', 400);
  }

  const isBulk =
    Boolean(data.bulk) ||
    data.audience === 'everyone' ||
    data.audience === 'members' ||
    data.audience === 'staff' ||
    data.audience === 'volunteers';

  if (isBulk && !canSendBulkCommunications(auth.user)) {
    return forbidden('Bulk sends require communications manage permission.');
  }

  if (isBulk && !data.confirm) {
    return validationError({ confirm: ['Bulk sends require confirm: true.'] });
  }

  let ministryId = data.ministryId || null;
  if (isMinistryScopedCommunicator(auth.user)) {
    const led = await db.ministry.findFirst({
      where: { leaderUserId: auth.user.id, ...(ministryId ? { id: ministryId } : {}) },
      select: { id: true },
    });
    if (!led) {
      return error('Ministry leaders may only send to their assigned ministry.', 403);
    }
    ministryId = led.id;
    if (data.audience !== 'ministry' && data.audience !== 'ministry_leaders') {
      return error('Ministry leaders may only target ministry audiences.', 403);
    }
  }

  if (
    (data.audience === 'ministry' || data.audience === 'ministry_leaders') &&
    !ministryId
  ) {
    return validationError({ ministryId: ['Ministry is required for this audience.'] });
  }

  if (data.audience === 'event_registrants' && !data.eventId) {
    return validationError({ eventId: ['Event is required for event registrants audience.'] });
  }

  const relatedUrl = sanitizeRelatedUrl(data.relatedUrl);
  const scheduledAt = data.scheduledAt ? new Date(data.scheduledAt) : null;
  const recurrenceUntil = data.recurrenceUntil ? new Date(data.recurrenceUntil) : null;
  const channels = data.channels || ['in_app'];

  const job = await enqueueCommunicationJob({
    type: 'manual_send',
    audience: data.audience,
    ministryId,
    eventId: data.eventId || null,
    announcementId: data.announcementId || null,
    payload: {
      title: data.title,
      message: data.message,
      relatedUrl,
      notificationType: data.notificationType || 'notice',
      transactional: false,
      ...(data.householdId ? { householdId: data.householdId } : {}),
    },
    channels,
    scheduledAt,
    priority: data.priority || 'normal',
    templateId: data.templateId || null,
    recurrenceRule: data.recurrenceRule || null,
    recurrenceUntil,
    idempotencyKey: data.idempotencyKey,
    createdById: auth.user.id,
  });

  await emitCommunicationEvent({
    type: isBulk ? 'communications.bulk_send' : 'communications.job_enqueued',
    userId: auth.user.id,
    entityId: job.id,
    request,
    details: { audience: data.audience, channels, priority: data.priority || 'normal' },
  });

  return success(
    {
      job: {
        id: job.id,
        status: job.status,
        audience: job.audience,
        channels: job.channels,
        priority: job.priority,
        scheduledAt: job.scheduledAt?.toISOString() ?? null,
        recurrenceRule: job.recurrenceRule,
        recurrenceUntil: job.recurrenceUntil?.toISOString() ?? null,
        createdAt: job.createdAt.toISOString(),
      },
    },
    scheduledAt && scheduledAt > new Date()
      ? 'Communication scheduled.'
      : 'Communication queued for delivery.',
    201
  );
}
