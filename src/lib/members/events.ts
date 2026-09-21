import { getClientIp, logSecurityEvent } from '@/lib/auth/audit';
import { db } from '@/lib/db';
import { notifyFromChurchEvent } from '@/lib/communications/service';

export type MembershipEventType =
  | 'membership.application_submitted'
  | 'membership.application_updated'
  | 'membership.application_reviewed'
  | 'membership.information_requested'
  | 'membership.application_approved'
  | 'membership.application_rejected'
  | 'membership.application_archived'
  | 'membership.member_created'
  | 'membership.member_updated'
  | 'membership.status_changed'
  | 'membership.household_changed'
  | 'membership.ministry_changed'
  | 'membership.member_archived'
  | 'membership.merged'
  | 'membership.member_card_created'
  | 'membership.import_validated'
  | 'membership.import_completed'
  | 'membership.export'
  | 'membership.transfer_updated'
  | 'membership.reactivated';

const SENSITIVE = /password|token|secret|hash/i;

const NOTIFY_TYPES = new Set<MembershipEventType>([
  'membership.application_submitted',
  'membership.information_requested',
  'membership.application_approved',
  'membership.application_rejected',
  'membership.status_changed',
]);

async function resolveMembershipRecipient(
  type: MembershipEventType,
  entityId?: string | null
): Promise<string | null> {
  if (!entityId) return null;

  if (
    type === 'membership.application_submitted' ||
    type === 'membership.information_requested' ||
    type === 'membership.application_approved' ||
    type === 'membership.application_rejected'
  ) {
    const application = await db.membershipApplication.findUnique({
      where: { id: entityId },
      select: { userId: true },
    });
    return application?.userId ?? null;
  }

  if (type === 'membership.status_changed') {
    const member = await db.member.findUnique({
      where: { id: entityId },
      select: { userId: true },
    });
    return member?.userId ?? null;
  }

  return null;
}

function membershipNotifyCopy(type: MembershipEventType, details?: Record<string, unknown>) {
  switch (type) {
    case 'membership.application_submitted':
      return {
        title: 'Application received',
        message: 'Your membership application was submitted successfully. We will review it soon.',
        relatedUrl: '/member/membership',
      };
    case 'membership.information_requested':
      return {
        title: 'More information needed',
        message: 'Church staff requested additional information for your membership application.',
        relatedUrl: '/member/membership',
      };
    case 'membership.application_approved':
      return {
        title: 'Membership approved',
        message: 'Your membership application was approved. Welcome to the church family.',
        relatedUrl: '/member/membership',
      };
    case 'membership.application_rejected':
      return {
        title: 'Application update',
        message: 'Your membership application was not approved at this time. You may contact the church office for guidance.',
        relatedUrl: '/member/membership',
      };
    case 'membership.status_changed':
      return {
        title: 'Membership status updated',
        message: `Your membership status changed${
          details?.to ? ` to ${String(details.to)}` : ''
        }.`,
        relatedUrl: '/member/membership',
      };
    default:
      return null;
  }
}

export async function emitMembershipEvent(input: {
  type: MembershipEventType;
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
    entity: 'membership',
    entityId: input.entityId ?? undefined,
    userId: input.userId ?? undefined,
    ipAddress: input.request ? getClientIp(input.request) : undefined,
    details,
  });

  if (NOTIFY_TYPES.has(input.type)) {
    const recipientId = await resolveMembershipRecipient(input.type, input.entityId);
    const copy = membershipNotifyCopy(input.type, details);
    if (recipientId && copy) {
      await notifyFromChurchEvent({
        type: input.type,
        userId: recipientId,
        entityId: input.entityId,
        title: copy.title,
        message: copy.message,
        relatedUrl: copy.relatedUrl,
        notificationType: 'membership_update',
        transactional: true,
        channels: ['in_app', 'email'],
      });
    }
  }
}
