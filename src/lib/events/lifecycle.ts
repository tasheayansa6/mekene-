import { getClientIp, logSecurityEvent } from '@/lib/auth/audit';

export type EventLifecycleEventType =
  | 'event.created'
  | 'event.updated'
  | 'event.published'
  | 'event.scheduled'
  | 'event.cancelled'
  | 'event.rescheduled'
  | 'event.registration_confirmed'
  | 'event.registration_cancelled'
  | 'event.registration_manual'
  | 'event.waitlist_promoted'
  | 'event.capacity_changed'
  | 'event.exported'
  | 'event.invitation_created'
  | 'event.program_item_added'
  | 'event.resource_reserved'
  | 'event.resource_reservation_updated'
  | 'event.checkin_completed'
  | 'event.schedule_changed';

const SENSITIVE = /password|token|secret|meetingUrl|authorization/i;

export async function emitEventLifecycle(input: {
  type: EventLifecycleEventType | string;
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
    entity: 'event',
    entityId: input.entityId ?? undefined,
    userId: input.userId ?? undefined,
    ipAddress: input.request ? getClientIp(input.request) : undefined,
    details,
  });
}
