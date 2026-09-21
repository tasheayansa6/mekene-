import { z } from 'zod';
import {
  error,
  forbidden,
  success,
  tooManyRequests,
  validationError,
} from '@/lib/api/response';
import { guardAdminWrite } from '@/lib/admin/guard';
import { formatZodErrors } from '@/lib/auth/validation';
import { readJson } from '@/lib/auth/http';
import { getClientIp } from '@/lib/auth/audit';
import { rateLimitKey } from '@/lib/auth/rate-limit';
import { canSendEmergency } from '@/lib/communications/access';
import { enqueueCommunicationJob } from '@/lib/communications/service';
import { emitCommunicationEvent } from '@/lib/communications/events';
import { sanitizeRelatedUrl } from '@/lib/communications/sanitize';

const emergencySchema = z.object({
  title: z.string().trim().min(1).max(160),
  message: z.string().trim().min(1).max(1000),
  audience: z.enum(['everyone', 'members', 'staff']).default('everyone'),
  ministryId: z.string().trim().nullable().optional(),
  eventId: z.string().trim().nullable().optional(),
  relatedUrl: z.string().trim().max(500).nullable().optional(),
  channels: z.array(z.enum(['in_app', 'email', 'telegram', 'sms'])).min(1),
  confirm: z.literal(true),
  confirmText: z.literal('SEND EMERGENCY'),
  idempotencyKey: z.string().trim().max(120).optional(),
});

export async function POST(request: Request) {
  const auth = await guardAdminWrite(request, 'communications', 'manage');
  if (!auth.ok) return auth.error;
  if (!canSendEmergency(auth.user)) return forbidden();

  const limited = rateLimitKey(
    `communications-emergency:${auth.user.id}:${getClientIp(request)}`,
    5,
    60_000
  );
  if (!limited.allowed) {
    return tooManyRequests(
      'Too many emergency send attempts. Please wait before trying again.',
      limited.retryAfterSeconds
    );
  }

  const parsed = emergencySchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const data = parsed.data;
  const relatedUrl = sanitizeRelatedUrl(data.relatedUrl);

  const job = await enqueueCommunicationJob({
    type: 'emergency_broadcast',
    audience: data.audience,
    ministryId: data.ministryId ?? null,
    eventId: data.eventId ?? null,
    payload: {
      title: data.title,
      message: data.message,
      relatedUrl,
      notificationType: 'notice',
      transactional: true,
    },
    channels: data.channels,
    priority: 'emergency',
    idempotencyKey: data.idempotencyKey,
    createdById: auth.user.id,
  });

  await emitCommunicationEvent({
    type: 'communications.emergency_send',
    userId: auth.user.id,
    entityId: job.id,
    request,
    details: { audience: data.audience, channels: data.channels },
  });

  return success(
    {
      job: {
        id: job.id,
        status: job.status,
        audience: job.audience,
        channels: job.channels,
        priority: job.priority,
        createdAt: job.createdAt.toISOString(),
      },
    },
    'Emergency broadcast queued.',
    201
  );
}
