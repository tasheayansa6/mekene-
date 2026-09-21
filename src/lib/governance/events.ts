import { getClientIp, logSecurityEvent } from '@/lib/auth/audit';
import { notifyFromChurchEvent } from '@/lib/communications/service';

export type GovernanceEventType =
  | 'leadership_appointed'
  | 'leadership_ended'
  | 'committee_member_added'
  | 'committee_member_removed'
  | 'meeting_created'
  | 'agenda_changed'
  | 'agenda_locked'
  | 'minutes_approved'
  | 'minutes_locked'
  | 'decision_created'
  | 'resolution_approved'
  | 'vote_cast'
  | 'vote_closed'
  | 'action_item_assigned'
  | 'action_item_completed'
  | 'policy_published'
  | 'policy_acknowledged'
  | 'document_accessed'
  | 'request_submitted'
  | 'request_assigned'
  | 'request_status_changed'
  | 'approval_action'
  | 'delegation_created'
  | 'term_expiring';

const TITLE_BY_TYPE: Record<GovernanceEventType, string> = {
  leadership_appointed: 'Leadership appointment update',
  leadership_ended: 'Leadership appointment update',
  committee_member_added: 'Committee membership update',
  committee_member_removed: 'Committee membership update',
  meeting_created: 'Governance meeting update',
  agenda_changed: 'Meeting agenda update',
  agenda_locked: 'Meeting agenda update',
  minutes_approved: 'Meeting minutes update',
  minutes_locked: 'Meeting minutes update',
  decision_created: 'Governance decision update',
  resolution_approved: 'Resolution update',
  vote_cast: 'Voting update',
  vote_closed: 'Voting update',
  action_item_assigned: 'Action item update',
  action_item_completed: 'Action item update',
  policy_published: 'Policy update',
  policy_acknowledged: 'Policy acknowledgement',
  document_accessed: 'Document access',
  request_submitted: 'Administrative request update',
  request_assigned: 'Administrative request update',
  request_status_changed: 'Administrative request update',
  approval_action: 'Approval update',
  delegation_created: 'Approval delegation update',
  term_expiring: 'Leadership term reminder',
};

export const GOVERNANCE_GENERIC_NOTIFY =
  'You have an update about church governance or administration.';

export async function emitGovernanceEvent(input: {
  type: GovernanceEventType;
  actorId?: string | null;
  entityId?: string | null;
  recipientUserId?: string | null;
  request?: Request;
  relatedUrl?: string;
  details?: Record<string, unknown>;
}) {
  await logSecurityEvent({
    action: input.type,
    entity: 'governance',
    entityId: input.entityId ?? null,
    userId: input.actorId ?? null,
    ipAddress: input.request ? getClientIp(input.request) : null,
    details: { event: input.type, ...(input.details ?? {}) },
  });

  if (!input.recipientUserId) return;

  await notifyFromChurchEvent({
    type: `governance.${input.type}`,
    userId: input.recipientUserId,
    entityId: input.entityId,
    title: TITLE_BY_TYPE[input.type],
    message: GOVERNANCE_GENERIC_NOTIFY,
    relatedUrl: input.relatedUrl || '/leadership',
    notificationType: 'system',
    transactional: true,
    channels: ['in_app'],
  });
}
