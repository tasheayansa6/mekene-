import type { DeliveryStatus } from '@prisma/client';
import { timingSafeEqual } from '@/lib/auth/csrf';
import { db } from '@/lib/db';

export function verifyWebhookSecret(
  request: Request,
  envKey: string
): 'ok' | 'not_configured' | 'unauthorized' {
  const secret = process.env[envKey]?.trim();
  if (!secret) return 'not_configured';

  const headerSecret = request.headers.get('X-Webhook-Secret')?.trim();
  const authHeader = request.headers.get('Authorization')?.trim();
  const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  const provided = headerSecret || bearer;

  if (!provided || !timingSafeEqual(provided, secret)) return 'unauthorized';
  return 'ok';
}

function mapWebhookStatus(status?: string | null): DeliveryStatus | null {
  if (!status) return null;
  const normalized = status.toLowerCase();
  if (['delivered', 'delivery', 'success'].includes(normalized)) return 'delivered';
  if (['sent', 'accepted'].includes(normalized)) return 'sent';
  if (['failed', 'failure', 'bounce', 'undelivered', 'rejected'].includes(normalized)) {
    return 'failed';
  }
  if (['pending', 'queued'].includes(normalized)) return 'pending';
  return null;
}

export async function updateDeliveryFromWebhook(input: {
  messageId?: string | null;
  providerReference?: string | null;
  status?: string | null;
}) {
  const ref = input.providerReference?.trim() || input.messageId?.trim();
  if (!ref) return { updated: false as const };

  const delivery = await db.notificationDelivery.findFirst({
    where: {
      OR: [
        { providerReference: ref },
        ...(input.messageId ? [{ providerReference: input.messageId }] : []),
      ],
    },
  });
  if (!delivery) return { updated: false as const };

  const mappedStatus = mapWebhookStatus(input.status);
  if (!mappedStatus || delivery.status === mappedStatus) {
    return { updated: false as const, id: delivery.id };
  }

  await db.notificationDelivery.update({
    where: { id: delivery.id },
    data: {
      status: mappedStatus,
      deliveredAt: mappedStatus === 'delivered' ? new Date() : delivery.deliveredAt,
      failedAt: mappedStatus === 'failed' ? new Date() : delivery.failedAt,
      sentAt:
        mappedStatus === 'sent' || mappedStatus === 'delivered'
          ? delivery.sentAt ?? new Date()
          : delivery.sentAt,
    },
  });

  return { updated: true as const, id: delivery.id };
}
