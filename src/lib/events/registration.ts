import { db } from '@/lib/db';
import type { Event, EventRegistration, EventRegistrationStatus } from '@prisma/client';
import { sanitizePlainText } from '@/lib/content/sanitize';
import { emitEventLifecycle } from './lifecycle';
import { notifyFromChurchEvent } from '@/lib/communications/service';

const ACTIVE_STATUSES: EventRegistrationStatus[] = ['registered', 'waitlisted', 'confirmed', 'attended'];
const SEATED_STATUSES: EventRegistrationStatus[] = ['registered', 'confirmed', 'attended'];

export type RegistrationErrorCode =
  | 'not_found'
  | 'cancelled'
  | 'closed'
  | 'deadline'
  | 'full'
  | 'already_registered'
  | 'unauthorized'
  | 'guest_disabled'
  | 'invitation_required'
  | 'invalid';

export class RegistrationError extends Error {
  constructor(
    public code: RegistrationErrorCode,
    message: string
  ) {
    super(message);
  }
}

async function nextRegistrationReference(tx: typeof db): Promise<string> {
  const seq = await tx.eventRegistrationSequence.upsert({
    where: { id: 'default' },
    update: { nextValue: { increment: 1 } },
    create: { id: 'default', prefix: 'BME-EVT-', nextValue: 2 },
  });
  const value = seq.nextValue - 1;
  return `${seq.prefix}${String(value).padStart(6, '0')}`;
}

export function parseReminderOffsets(raw: string | null | undefined): number[] {
  const source = raw || process.env.EVENT_REMINDER_OFFSETS_MINUTES || '10080,4320,1440,60';
  return source
    .split(',')
    .map((v) => Number(v.trim()))
    .filter((v) => Number.isFinite(v) && v > 0)
    .slice(0, 8);
}

export async function getEventCapacityStats(eventId: string, capacity: number | null) {
  const [registered, waitlisted] = await Promise.all([
    db.eventRegistration.count({
      where: { eventId, status: { in: SEATED_STATUSES } },
    }),
    db.eventRegistration.count({
      where: { eventId, status: 'waitlisted' },
    }),
  ]);
  const available = capacity == null ? null : Math.max(0, capacity - registered);
  return {
    capacity,
    registered,
    waitlisted,
    available,
    isFull: capacity != null && registered >= capacity,
  };
}

export function registrationWindowOpen(
  event: Pick<
    Event,
    'status' | 'registrationRequired' | 'registrationDeadline' | 'startAt' | 'endAt'
  >,
  now = new Date()
): { open: boolean; reason?: RegistrationErrorCode; message?: string } {
  if (event.status === 'cancelled') {
    return { open: false, reason: 'cancelled', message: 'This event has been cancelled.' };
  }
  if (event.status === 'archived' || event.status === 'completed') {
    return { open: false, reason: 'closed', message: 'Registration is closed for this event.' };
  }
  if (!event.registrationRequired) {
    return { open: false, reason: 'closed', message: 'Registration is not required.' };
  }
  if (event.registrationDeadline && event.registrationDeadline <= now) {
    return { open: false, reason: 'deadline', message: 'Registration Closed' };
  }
  if (event.endAt <= now) {
    return { open: false, reason: 'closed', message: 'This event has ended.' };
  }
  return { open: true };
}

async function assertCanRegister(
  event: Event,
  userId: string | null,
  guestEmail: string | null
) {
  const window = registrationWindowOpen(event);
  if (!window.open && window.reason !== 'closed') {
    throw new RegistrationError(window.reason || 'closed', window.message || 'Registration closed.');
  }
  if (!event.registrationRequired) {
    throw new RegistrationError('closed', 'Registration is not required.');
  }
  if (!window.open) {
    throw new RegistrationError(window.reason || 'closed', window.message || 'Registration closed.');
  }

  if (event.registrationAccess === 'invitation') {
    const invite = await db.eventInvitation.findFirst({
      where: {
        eventId: event.id,
        status: 'pending',
        OR: [
          ...(userId ? [{ userId }] : []),
          ...(guestEmail ? [{ guestEmail: guestEmail.toLowerCase() }] : []),
        ],
      },
    });
    if (!invite) {
      throw new RegistrationError('invitation_required', 'This event is invitation only.');
    }
  }

  if (event.registrationAccess === 'members' && !userId) {
    throw new RegistrationError('unauthorized', 'Members only registration.');
  }

  if (event.registrationAccess === 'ministry') {
    if (!userId || !event.ministryId) {
      throw new RegistrationError('unauthorized', 'Ministry members only.');
    }
    const member = await db.member.findFirst({
      where: { userId, status: { in: ['approved', 'active'] } },
      select: { id: true },
    });
    if (!member) throw new RegistrationError('unauthorized', 'Ministry members only.');
    const link = await db.memberMinistry.findFirst({
      where: {
        memberId: member.id,
        ministryId: event.ministryId,
        status: { in: ['active', 'interested'] },
      },
    });
    if (!link) throw new RegistrationError('unauthorized', 'Ministry members only.');
  }
}

export async function registerForEvent(input: {
  eventId: string;
  userId?: string | null;
  guestName?: string | null;
  guestEmail?: string | null;
  guestPhone?: string | null;
  guestPartySize?: number;
  notes?: string | null;
  recordedById?: string | null;
  answers?: Array<{ questionId: string; value: string }>;
  request?: Request;
}): Promise<EventRegistration> {
  const event = await db.event.findUnique({ where: { id: input.eventId } });
  if (!event) throw new RegistrationError('not_found', 'Event not found.');

  const userId = input.userId || null;
  const guestEmail = input.guestEmail?.trim().toLowerCase() || null;

  if (!userId) {
    if (!event.allowGuestRegistration) {
      throw new RegistrationError('guest_disabled', 'Guest registration is not enabled.');
    }
    if (!input.guestName?.trim() || !guestEmail) {
      throw new RegistrationError('invalid', 'Guest name and email are required.');
    }
  }

  await assertCanRegister(event, userId, guestEmail);

  if (userId) {
    const existing = await db.eventRegistration.findFirst({
      where: { eventId: event.id, userId, status: { in: ACTIVE_STATUSES } },
    });
    if (existing) {
      throw new RegistrationError('already_registered', 'You are already registered for this event.');
    }
  }

  const registration = await db.$transaction(async (tx) => {
    const seated = await tx.eventRegistration.count({
      where: { eventId: event.id, status: { in: SEATED_STATUSES } },
    });

    let status: EventRegistrationStatus = 'registered';
    let waitlistPosition: number | null = null;

    if (event.capacity != null && seated >= event.capacity) {
      if (!event.waitlistEnabled) {
        throw new RegistrationError('full', 'This event is full.');
      }
      status = 'waitlisted';
      waitlistPosition =
        (await tx.eventRegistration.count({
          where: { eventId: event.id, status: 'waitlisted' },
        })) + 1;
    }

    const reference = await nextRegistrationReference(tx as unknown as typeof db);

    const created = await tx.eventRegistration.create({
      data: {
        reference,
        eventId: event.id,
        userId,
        guestName: userId ? null : sanitizePlainText(input.guestName || '', 120),
        guestEmail: userId ? null : guestEmail,
        guestPhone: userId ? null : input.guestPhone?.trim().slice(0, 40) || null,
        guestPartySize: Math.min(20, Math.max(1, input.guestPartySize || 1)),
        status,
        waitlistPosition,
        notes: input.notes ? sanitizePlainText(input.notes, 500) : null,
        confirmedAt: status === 'registered' ? new Date() : null,
        recordedById: input.recordedById || null,
      },
    });

    if (input.answers?.length) {
      for (const answer of input.answers.slice(0, 20)) {
        await tx.eventRegistrationAnswer.create({
          data: {
            registrationId: created.id,
            questionId: answer.questionId,
            value: sanitizePlainText(answer.value, 500),
          },
        });
      }
    }

    if (event.registrationAccess === 'invitation' && (userId || guestEmail)) {
      await tx.eventInvitation.updateMany({
        where: {
          eventId: event.id,
          status: 'pending',
          OR: [
            ...(userId ? [{ userId }] : []),
            ...(guestEmail ? [{ guestEmail }] : []),
          ],
        },
        data: { status: 'accepted', respondedAt: new Date() },
      });
    }

    return created;
  });

  await emitEventLifecycle({
    type: input.recordedById
      ? 'event.registration_manual'
      : 'event.registration_confirmed',
    userId: userId || input.recordedById,
    entityId: registration.id,
    request: input.request,
    details: {
      eventId: event.id,
      status: registration.status,
      reference: registration.reference,
    },
  });

  if (userId) {
    await notifyFromChurchEvent({
      type: 'event.registration_confirmed',
      userId,
      entityId: registration.id,
      title:
        registration.status === 'waitlisted'
          ? 'Added to event waitlist'
          : 'Event registration confirmed',
      message:
        registration.status === 'waitlisted'
          ? `You are on the waitlist for ${event.title}. Reference ${registration.reference}.`
          : `You are registered for ${event.title}. Reference ${registration.reference}.`,
      relatedUrl: `/member/events/registrations/${registration.id}`,
      notificationType: 'event_reminder',
      transactional: true,
      channels: ['in_app', 'email'],
    });
  }

  return registration;
}

export async function cancelRegistration(input: {
  registrationId: string;
  userId?: string | null;
  admin?: boolean;
  request?: Request;
}) {
  const existing = await db.eventRegistration.findUnique({
    where: { id: input.registrationId },
    include: { event: true },
  });
  if (!existing) throw new RegistrationError('not_found', 'Registration not found.');
  if (!input.admin && existing.userId !== input.userId) {
    throw new RegistrationError('unauthorized', 'Not your registration.');
  }
  if (existing.status === 'cancelled') return existing;

  const wasSeated = SEATED_STATUSES.includes(existing.status);

  const updated = await db.eventRegistration.update({
    where: { id: existing.id },
    data: {
      status: 'cancelled',
      cancelledAt: new Date(),
      waitlistPosition: null,
    },
  });

  await emitEventLifecycle({
    type: 'event.registration_cancelled',
    userId: input.userId,
    entityId: updated.id,
    request: input.request,
    details: { eventId: existing.eventId },
  });

  if (wasSeated && existing.event.waitlistEnabled) {
    await promoteNextWaitlisted(existing.eventId, input.request);
  }

  if (existing.userId) {
    await notifyFromChurchEvent({
      type: 'event.registration_cancelled',
      userId: existing.userId,
      entityId: updated.id,
      title: 'Registration cancelled',
      message: `Your registration for ${existing.event.title} was cancelled.`,
      relatedUrl: `/events/${existing.event.slug}`,
      notificationType: 'event_reminder',
      transactional: true,
      channels: ['in_app'],
    });
  }

  return updated;
}

export async function promoteNextWaitlisted(eventId: string, request?: Request) {
  const event = await db.event.findUnique({ where: { id: eventId } });
  if (!event || !event.waitlistEnabled) return null;

  return db.$transaction(async (tx) => {
    const seated = await tx.eventRegistration.count({
      where: { eventId, status: { in: SEATED_STATUSES } },
    });
    if (event.capacity != null && seated >= event.capacity) return null;

    const next = await tx.eventRegistration.findFirst({
      where: { eventId, status: 'waitlisted' },
      orderBy: [{ waitlistPosition: 'asc' }, { registeredAt: 'asc' }],
    });
    if (!next) return null;

    const promoted = await tx.eventRegistration.update({
      where: { id: next.id },
      data: {
        status: 'confirmed',
        waitlistPosition: null,
        promotedAt: new Date(),
        confirmedAt: new Date(),
      },
    });

    await emitEventLifecycle({
      type: 'event.waitlist_promoted',
      entityId: promoted.id,
      request,
      details: { eventId },
    });

    if (promoted.userId) {
      await notifyFromChurchEvent({
        type: 'event.waitlist_promoted',
        userId: promoted.userId,
        entityId: promoted.id,
        title: 'Waitlist promotion',
        message: `A seat opened for ${event.title}. Your registration is confirmed (${promoted.reference}).`,
        relatedUrl: `/member/events/registrations/${promoted.id}`,
        notificationType: 'event_reminder',
        transactional: true,
        channels: ['in_app', 'email'],
      });
    }

    return promoted;
  });
}

export function findLocationConflicts(input: {
  locationId: string | null | undefined;
  startAt: Date;
  endAt: Date;
  excludeEventId?: string;
}) {
  if (!input.locationId) return Promise.resolve([]);
  return db.event.findMany({
    where: {
      locationId: input.locationId,
      status: { notIn: ['cancelled', 'archived'] },
      ...(input.excludeEventId ? { id: { not: input.excludeEventId } } : {}),
      startAt: { lt: input.endAt },
      endAt: { gt: input.startAt },
    },
    select: {
      id: true,
      title: true,
      slug: true,
      startAt: true,
      endAt: true,
      status: true,
    },
    take: 20,
  });
}
