import { db } from '@/lib/db';
import { emitEventLifecycle } from './lifecycle';
import { notifyFromChurchEvent } from '@/lib/communications/service';

export class CheckInError extends Error {
  constructor(
    public code: 'not_found' | 'duplicate' | 'invalid' | 'unauthorized',
    message: string
  ) {
    super(message);
  }
}

export async function checkInEventRegistration(input: {
  eventId: string;
  reference?: string;
  registrationId?: string;
  actorId: string;
  request?: Request;
}) {
  if (!input.reference && !input.registrationId) {
    throw new CheckInError('invalid', 'Provide a registration reference or id.');
  }

  const registration = await db.eventRegistration.findFirst({
    where: {
      eventId: input.eventId,
      ...(input.registrationId
        ? { id: input.registrationId }
        : { reference: input.reference!.toUpperCase() }),
    },
    include: { event: true, user: true },
  });

  if (!registration) {
    throw new CheckInError('not_found', 'Registration not found for this event.');
  }
  if (registration.status === 'cancelled') {
    throw new CheckInError('invalid', 'This registration was cancelled.');
  }
  if (registration.status === 'attended') {
    throw new CheckInError('duplicate', 'Already checked in.');
  }
  if (!['registered', 'confirmed', 'waitlisted'].includes(registration.status)) {
    throw new CheckInError('invalid', `Cannot check in with status ${registration.status}.`);
  }

  const updated = await db.eventRegistration.update({
    where: { id: registration.id },
    data: { status: 'attended' },
  });

  await emitEventLifecycle({
    type: 'event.checkin_completed',
    userId: input.actorId,
    entityId: registration.id,
    request: input.request,
    details: { eventId: input.eventId, reference: registration.reference },
  });

  if (registration.userId) {
    await notifyFromChurchEvent({
      type: 'event.checkin_completed',
      userId: registration.userId,
      entityId: registration.id,
      title: 'Event check-in recorded',
      message: `You were checked in for ${registration.event.title}.`,
      relatedUrl: `/member/events/registrations/${registration.id}`,
      notificationType: 'event_reminder',
      transactional: true,
      channels: ['in_app'],
    });
  }

  return updated;
}
