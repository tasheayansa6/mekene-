import { db } from '@/lib/db';
import { error, success, validationError } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';
import { readJson, rejectIfCsrfInvalid } from '@/lib/auth/http';
import { sanitizePlainText } from '@/lib/content/sanitize';
import { serializeVolunteerRequest } from '@/lib/volunteers/serialize';
import {
  formatZodErrors,
  volunteerRequestCreateSchema,
} from '@/lib/volunteers/validation';
import { requestReplacement, VolunteerWriteError } from '@/lib/volunteers/write';

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;
  const member = await db.member.findUnique({
    where: { userId: auth.user.id },
    select: { id: true },
  });
  if (!member) return success({ requests: [] });
  const rows = await db.volunteerRequest.findMany({
    where: { memberId: member.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  return success({ requests: rows.map(serializeVolunteerRequest) });
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
  if (!member) return error('You do not have a church membership record yet.', 404);

  const parsed = volunteerRequestCreateSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  if (parsed.data.type === 'replacement' && parsed.data.assignmentId) {
    try {
      const result = await requestReplacement({
        assignmentId: parsed.data.assignmentId,
        memberId: member.id,
        reason: parsed.data.note,
        actorId: auth.user.id,
        request,
      });
      if (!result) return error('Assignment not found.', 404);
      return success(result, 'Replacement requested.', 201);
    } catch (err) {
      if (err instanceof VolunteerWriteError) return error(err.message, 400);
      throw err;
    }
  }

  const row = await db.volunteerRequest.create({
    data: {
      memberId: member.id,
      type: parsed.data.type,
      ministryId: parsed.data.ministryId || null,
      teamId: parsed.data.teamId || null,
      assignmentId: parsed.data.assignmentId || null,
      note: parsed.data.note ? sanitizePlainText(parsed.data.note, 200) : null,
    },
  });

  if (parsed.data.type === 'leave' && parsed.data.leaveStartAt && parsed.data.leaveEndAt) {
    const startAt = new Date(parsed.data.leaveStartAt);
    const endAt = new Date(parsed.data.leaveEndAt);
    if (!Number.isNaN(startAt.getTime()) && !Number.isNaN(endAt.getTime()) && endAt > startAt) {
      await db.availabilityException.create({
        data: {
          memberId: member.id,
          startAt,
          endAt,
          reason: parsed.data.note ? sanitizePlainText(parsed.data.note, 80) : 'Unavailable',
          isAvailable: false,
        },
      });
      await db.volunteerProfile.updateMany({
        where: { memberId: member.id },
        data: { status: 'temporarily_unavailable' },
      });
    }
  }

  return success({ request: serializeVolunteerRequest(row) }, 'Request submitted.', 201);
}
