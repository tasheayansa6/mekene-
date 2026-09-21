import { db } from '@/lib/db';
import { error, forbidden, notFound, success, validationError } from '@/lib/api/response';
import { readJson } from '@/lib/auth/http';
import { guardAdminWrite } from '@/lib/admin/guard';
import { canManageRegistrations, canMutateEventRecord } from '@/lib/events/registration-access';
import { eventWhereForUser } from '@/lib/events/access';
import { formatZodErrors, eventCheckInSchema } from '@/lib/events/validation';
import { CheckInError, checkInEventRegistration } from '@/lib/events/checkin';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const auth = await guardAdminWrite(request, 'events', 'assign');
  if (!auth.ok) return auth.error;
  if (!canManageRegistrations(auth.user)) return forbidden();

  const { id } = await context.params;
  const scoped = eventWhereForUser(auth.user);
  const event = await db.event.findFirst({
    where: scoped ? { AND: [{ id }, scoped] } : { id },
    include: { ministry: { select: { leaderUserId: true } } },
  });
  if (!event) return notFound('Event');
  if (!canMutateEventRecord(auth.user, event)) return forbidden();

  const parsed = eventCheckInSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  try {
    const registration = await checkInEventRegistration({
      eventId: id,
      reference: parsed.data.reference,
      registrationId: parsed.data.registrationId,
      actorId: auth.user.id,
      request,
    });
    return success(
      {
        id: registration.id,
        reference: registration.reference,
        status: registration.status,
      },
      'Check-in recorded.'
    );
  } catch (err) {
    if (err instanceof CheckInError) {
      const status = err.code === 'duplicate' ? 409 : err.code === 'not_found' ? 404 : 400;
      return error(err.message, status);
    }
    throw err;
  }
}
