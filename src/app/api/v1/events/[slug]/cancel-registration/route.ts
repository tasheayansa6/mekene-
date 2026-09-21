import { db } from '@/lib/db';
import { error, notFound, success, tooManyRequests } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';
import { rejectIfCsrfInvalid } from '@/lib/auth/http';
import { rateLimitKey } from '@/lib/auth/rate-limit';
import { getClientIp } from '@/lib/auth/audit';
import { RegistrationError, cancelRegistration } from '@/lib/events/registration';

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const csrf = rejectIfCsrfInvalid(request);
  if (csrf) return csrf;

  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const limited = rateLimitKey(
    `event-cancel:${auth.user.id}:${getClientIp(request)}`,
    30,
    60 * 60 * 1000
  );
  if (!limited.allowed) return tooManyRequests('Too many cancellation attempts.', limited.retryAfterSeconds);

  const { slug } = await context.params;
  const event = await db.event.findFirst({
    where: { OR: [{ slug }, { id: slug }] },
    select: { id: true },
  });
  if (!event) return notFound('Event');

  const existing = await db.eventRegistration.findFirst({
    where: {
      eventId: event.id,
      userId: auth.user.id,
      status: { in: ['registered', 'waitlisted', 'confirmed'] },
    },
    orderBy: { registeredAt: 'desc' },
  });
  if (!existing) return notFound('Registration');

  try {
    const updated = await cancelRegistration({
      registrationId: existing.id,
      userId: auth.user.id,
      request,
    });
    return success(
      {
        registration: {
          id: updated.id,
          reference: updated.reference,
          status: updated.status,
          cancelledAt: updated.cancelledAt?.toISOString() ?? null,
        },
      },
      'Registration cancelled.'
    );
  } catch (err) {
    if (err instanceof RegistrationError) {
      return error(err.message, err.code === 'unauthorized' ? 403 : 400);
    }
    throw err;
  }
}
