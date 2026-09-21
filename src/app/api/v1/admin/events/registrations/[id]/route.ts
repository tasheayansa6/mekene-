import { z } from 'zod';
import { db } from '@/lib/db';
import { error, forbidden, notFound, success, validationError } from '@/lib/api/response';
import { guardAdminWrite } from '@/lib/admin/guard';
import { formatZodErrors } from '@/lib/auth/validation';
import { readJson } from '@/lib/auth/http';
import { canManageRegistrations } from '@/lib/events/registration-access';
import {
  RegistrationError,
  cancelRegistration,
  promoteNextWaitlisted,
} from '@/lib/events/registration';
import { emitEventLifecycle } from '@/lib/events/lifecycle';

const schema = z.object({
  status: z.enum(['registered', 'waitlisted', 'confirmed', 'cancelled', 'attended', 'no_show']).optional(),
  action: z.enum(['cancel', 'promote', 'confirm']).optional(),
  notes: z.string().trim().max(500).optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await guardAdminWrite(request, 'events', 'assign');
  if (!auth.ok) return auth.error;
  if (!canManageRegistrations(auth.user)) return forbidden();

  const { id } = await context.params;
  const existing = await db.eventRegistration.findUnique({ where: { id } });
  if (!existing) return notFound('Registration');

  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  try {
    if (parsed.data.action === 'cancel' || parsed.data.status === 'cancelled') {
      const updated = await cancelRegistration({
        registrationId: id,
        userId: auth.user.id,
        admin: true,
        request,
      });
      return success({ registration: { id: updated.id, status: updated.status } }, 'Registration cancelled.');
    }

    if (parsed.data.action === 'promote') {
      const promoted = await promoteNextWaitlisted(existing.eventId, request);
      if (!promoted) return error('No waitlisted registrant to promote, or event is full.', 400);
      return success({ registration: { id: promoted.id, status: promoted.status } }, 'Waitlist promoted.');
    }

    const updated = await db.eventRegistration.update({
      where: { id },
      data: {
        ...(parsed.data.status ? { status: parsed.data.status } : {}),
        ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes } : {}),
        ...(parsed.data.status === 'confirmed' ? { confirmedAt: new Date() } : {}),
      },
    });

    await emitEventLifecycle({
      type: 'event.registration_confirmed',
      userId: auth.user.id,
      entityId: updated.id,
      request,
      details: { status: updated.status },
    });

    return success({ registration: { id: updated.id, status: updated.status } }, 'Registration updated.');
  } catch (err) {
    if (err instanceof RegistrationError) return error(err.message, 400);
    throw err;
  }
}
