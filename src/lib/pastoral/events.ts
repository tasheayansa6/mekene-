import { getClientIp, logSecurityEvent } from '@/lib/auth/audit';
import { notifyFromChurchEvent } from '@/lib/communications/service';

export type PastoralEventType = 'visit_scheduled' | 'followup_due' | 'case_assigned';

export const PASTORAL_GENERIC_NOTIFY_MESSAGE =
  'You have an update from the church care team.';

/**
 * Pastoral notifications must stay generic — never include note/case summary content.
 */
export async function emitPastoralEvent(input: {
  type: PastoralEventType;
  actorId?: string | null;
  entityId?: string | null;
  recipientUserId?: string | null;
  request?: Request;
}) {
  await logSecurityEvent({
    action: input.type,
    entity: 'pastoral',
    entityId: input.entityId ?? null,
    userId: input.actorId ?? null,
    ipAddress: input.request ? getClientIp(input.request) : null,
    details: { event: input.type },
  });

  if (!input.recipientUserId) return;

  await notifyFromChurchEvent({
    type: `pastoral.${input.type}`,
    userId: input.recipientUserId,
    entityId: input.entityId,
    title: 'Care team update',
    message: PASTORAL_GENERIC_NOTIFY_MESSAGE,
    relatedUrl: '/admin/pastoral',
    notificationType: 'system',
    transactional: true,
    channels: ['in_app'],
  });
}
