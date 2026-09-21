import { getClientIp, logSecurityEvent } from '@/lib/auth/audit';
import { notifyFromChurchEvent } from '@/lib/communications/service';

export type GivingEventType =
  | 'giving.contribution_created'
  | 'giving.contribution_successful'
  | 'giving.contribution_failed'
  | 'giving.contribution_cancelled'
  | 'giving.refund_recorded'
  | 'giving.campaign_created'
  | 'giving.campaign_updated'
  | 'giving.pledge_created'
  | 'giving.webhook_processed'
  | 'giving.exported'
  | 'giving.receipt_issued'
  | 'giving.fund_created'
  | 'giving.fund_updated'
  | 'giving.provider_config_updated'
  | 'giving.qr_created'
  | 'giving.settings_updated'
  | 'giving.schedule_cancelled';

const SENSITIVE = /password|secret|token|card|cvv|pan|authorization/i;

export async function emitGivingEvent(input: {
  type: GivingEventType;
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
    entity: 'giving',
    entityId: input.entityId ?? undefined,
    userId: input.userId ?? undefined,
    ipAddress: input.request ? getClientIp(input.request) : undefined,
    details,
  });

  if (input.type === 'giving.contribution_successful' && input.userId) {
    const reference =
      typeof details.reference === 'string' ? details.reference : null;
    await notifyFromChurchEvent({
      type: input.type,
      userId: input.userId,
      entityId: input.entityId,
      title: 'Contribution received',
      message: reference
        ? `Thank you. Your contribution was recorded successfully (ref ${reference}). Amounts are shown only on your secure receipt.`
        : 'Thank you. Your contribution was recorded successfully. Amounts are shown only on your secure receipt.',
      relatedUrl: reference ? `/give/receipt/${reference}` : '/member/giving',
      notificationType: 'giving_notification',
      transactional: true,
      channels: ['in_app', 'email'],
    });
  }
}
