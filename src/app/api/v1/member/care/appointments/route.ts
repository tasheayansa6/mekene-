import { db } from '@/lib/db';
import { badRequest, forbidden, success } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';
import { readJson, rejectIfCsrfInvalid } from '@/lib/auth/http';
import {
  listMemberAppointments,
  requestAppointment,
} from '@/lib/pastoral/appointments';

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const member = await db.member.findUnique({
    where: { userId: auth.user.id },
    select: { id: true },
  });
  if (!member) return success([]);

  const rows = await listMemberAppointments(member.id);
  return success(rows);
}

export async function POST(request: Request) {
  const csrfError = rejectIfCsrfInvalid(request);
  if (csrfError) return csrfError;

  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const member = await db.member.findUnique({
    where: { userId: auth.user.id },
    select: { id: true },
  });
  if (!member) {
    return forbidden('A member profile is required to request an appointment.');
  }

  const body = (await readJson(request)) as Record<string, unknown> | null;
  if (!body || typeof body.scheduledAt !== 'string') {
    return badRequest('scheduledAt is required');
  }

  try {
    const row = await requestAppointment({
      memberId: member.id,
      createdById: auth.user.id,
      scheduledAt: new Date(body.scheduledAt),
      locationType: typeof body.locationType === 'string' ? body.locationType : null,
      locationNote: typeof body.locationNote === 'string' ? body.locationNote : null,
      assignedToId: typeof body.assignedToId === 'string' ? body.assignedToId : null,
      request,
    });
    return success(row, 'Appointment requested.', 201);
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : 'Unable to request appointment');
  }
}
