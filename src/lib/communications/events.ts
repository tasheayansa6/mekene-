import { getClientIp, logSecurityEvent } from '@/lib/auth/audit';

export type CommunicationEventType =
  | 'communications.notification_sent'
  | 'communications.job_enqueued'
  | 'communications.job_processed'
  | 'communications.notification_retry'
  | 'communications.telegram_publish'
  | 'communications.bulk_send'
  | 'communications.preferences_updated';

const SENSITIVE = /password|secret|token|authorization|api[_-]?key|cookie|cvv|pan|card/i;

export async function emitCommunicationEvent(input: {
  type: CommunicationEventType | string;
  userId?: string | null;
  entityId?: string | null;
  request?: Request;
  details?: Record<string, unknown>;
}) {
  const details: Record<string, unknown> = { event: input.type };
  if (input.details) {
    for (const [key, value] of Object.entries(input.details)) {
      if (SENSITIVE.test(key)) continue;
      details[key] = value;
    }
  }

  await logSecurityEvent({
    action: input.type.split('.').pop() || input.type,
    entity: 'communications',
    entityId: input.entityId ?? undefined,
    userId: input.userId ?? undefined,
    ipAddress: input.request ? getClientIp(input.request) : undefined,
    details,
  });
}
