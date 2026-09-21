import { db } from '@/lib/db';
import { badRequest, forbidden, notFound, success } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';
import { rejectIfCsrfInvalid } from '@/lib/auth/http';
import { cancelOwnAppointment } from '@/lib/pastoral/appointments';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const csrfError = rejectIfCsrfInvalid(request);
  if (csrfError) return csrfError;

  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const member = await db.member.findUnique({
    where: { userId: auth.user.id },
    select: { id: true },
  });
  if (!member) return forbidden();

  const { id } = await context.params;
  try {
    const row = await cancelOwnAppointment({
      visitId: id,
      memberId: member.id,
      cancelledById: auth.user.id,
      request,
    });
    if (!row) return notFound('Appointment');
    return success(row, 'Appointment cancelled.');
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : 'Unable to cancel');
  }
}
