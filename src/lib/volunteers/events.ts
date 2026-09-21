import { getClientIp, logSecurityEvent } from '@/lib/auth/audit';
import { notifyFromChurchEvent } from '@/lib/communications/service';

export type VolunteerEventType =
  | 'application_submitted'
  | 'application_reviewed'
  | 'assignment_proposed'
  | 'assignment_confirmed'
  | 'assignment_declined'
  | 'assignment_changed'
  | 'assignment_cancelled'
  | 'substitution_requested'
  | 'substitution_confirmed'
  | 'training_enrolled'
  | 'training_waitlisted'
  | 'training_assigned'
  | 'training_expired';

/** Generic copy only — never include application motivation, review notes, or private details. */
export const VOLUNTEER_GENERIC_NOTIFY_MESSAGE =
  'You have an update about volunteering at the church.';

const TITLE_BY_TYPE: Record<VolunteerEventType, string> = {
  application_submitted: 'Volunteer application update',
  application_reviewed: 'Volunteer application update',
  assignment_proposed: 'Service assignment update',
  assignment_confirmed: 'Service assignment update',
  assignment_declined: 'Service assignment update',
  assignment_changed: 'Service assignment update',
  assignment_cancelled: 'Service assignment update',
  substitution_requested: 'Service assignment update',
  substitution_confirmed: 'Service assignment update',
  training_enrolled: 'Training update',
  training_waitlisted: 'Training update',
  training_assigned: 'Training update',
  training_expired: 'Training update',
};

/**
 * Emit a volunteer/ministry event via security audit + generic in-app notification.
 */
export async function emitVolunteerEvent(input: {
  type: VolunteerEventType;
  actorId?: string | null;
  entityId?: string | null;
  recipientUserId?: string | null;
  request?: Request;
  relatedUrl?: string;
}) {
  await logSecurityEvent({
    action: input.type,
    entity: 'volunteers',
    entityId: input.entityId ?? null,
    userId: input.actorId ?? null,
    ipAddress: input.request ? getClientIp(input.request) : null,
    details: { event: input.type },
  });

  if (!input.recipientUserId) return;

  await notifyFromChurchEvent({
    type: `volunteers.${input.type}`,
    userId: input.recipientUserId,
    entityId: input.entityId,
    title: TITLE_BY_TYPE[input.type],
    message: VOLUNTEER_GENERIC_NOTIFY_MESSAGE,
    relatedUrl: input.relatedUrl || '/member/volunteering',
    notificationType: 'system',
    transactional: true,
    channels: ['in_app'],
  });
}
