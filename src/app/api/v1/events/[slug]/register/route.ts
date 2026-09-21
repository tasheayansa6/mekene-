import { z } from 'zod';
import { db } from '@/lib/db';
import { error, forbidden, notFound, success, tooManyRequests, validationError } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';
import { formatZodErrors } from '@/lib/auth/validation';
import { readJson, rejectIfCsrfInvalid } from '@/lib/auth/http';
import { rateLimitKey } from '@/lib/auth/rate-limit';
import { getClientIp } from '@/lib/auth/audit';
import {
  RegistrationError,
  getEventCapacityStats,
  registerForEvent,
  registrationWindowOpen,
} from '@/lib/events/registration';
import { isEventPubliclyVisible } from '@/lib/events/status';

const guestSchema = z.object({
  guestName: z.string().trim().min(2).max(120).optional(),
  guestEmail: z.string().trim().email().max(160).optional(),
  guestPhone: z.string().trim().max(40).optional(),
  guestPartySize: z.number().int().min(1).max(20).optional(),
  notes: z.string().trim().max(500).optional(),
  answers: z
    .array(z.object({ questionId: z.string(), value: z.string().max(500) }))
    .max(20)
    .optional(),
});

async function findEvent(slugOrId: string) {
  return db.event.findFirst({
    where: { OR: [{ slug: slugOrId }, { id: slugOrId }] },
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  const csrf = rejectIfCsrfInvalid(request);
  if (csrf) return csrf;

  const limited = rateLimitKey(`event-register:${getClientIp(request)}`, 30, 60 * 60 * 1000);
  if (!limited.allowed) return tooManyRequests('Too many registration attempts.', limited.retryAfterSeconds);

  const event = await findEvent(slug);
  if (!event || !isEventPubliclyVisible(event)) return notFound('Event');

  const auth = await requireAuth(request);
  const body = guestSchema.safeParse(await readJson(request));
  if (!body.success) return validationError(formatZodErrors(body.error));

  if (!auth.ok && !event.allowGuestRegistration) {
    return forbidden('Sign in to register for this event.');
  }

  try {
    const registration = await registerForEvent({
      eventId: event.id,
      userId: auth.ok ? auth.user.id : null,
      guestName: body.data.guestName,
      guestEmail: body.data.guestEmail,
      guestPhone: body.data.guestPhone,
      guestPartySize: body.data.guestPartySize,
      notes: body.data.notes,
      answers: body.data.answers,
      request,
    });
    const capacity = await getEventCapacityStats(event.id, event.capacity);
    return success(
      {
        registration: {
          id: registration.id,
          reference: registration.reference,
          status: registration.status,
          waitlistPosition: registration.waitlistPosition,
        },
        capacity,
        window: registrationWindowOpen(event),
      },
      registration.status === 'waitlisted'
        ? 'You have been added to the waitlist.'
        : 'Registration confirmed.',
      201
    );
  } catch (err) {
    if (err instanceof RegistrationError) {
      const status =
        err.code === 'unauthorized' || err.code === 'invitation_required'
          ? 403
          : err.code === 'not_found'
            ? 404
            : 400;
      return error(err.message, status as 400 | 403 | 404);
    }
    throw err;
  }
}
