import { db } from '@/lib/db';
import { badRequest, forbidden, notFound, success } from '@/lib/api/response';
import { guardAdminWrite } from '@/lib/admin/guard';
import { readJson } from '@/lib/auth/http';
import { canManageMeeting } from '@/lib/governance/access';
import { isOneOf, ATTENDANCE_STATUSES } from '@/lib/governance/status';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await guardAdminWrite(request, 'governance', 'update');
  if (!auth.ok) return auth.error;

  const { id: meetingId } = await context.params;
  const meeting = await db.governanceMeeting.findUnique({
    where: { id: meetingId },
    include: { committee: true },
  });
  if (!meeting) return notFound('Meeting');
  if (!canManageMeeting(auth.user, meeting)) return forbidden();

  const body = (await readJson(request)) as Record<string, unknown> | null;
  if (!body) return badRequest('Invalid body.');

  const attendance =
    typeof body.attendance === 'string' && isOneOf(body.attendance, ATTENDANCE_STATUSES)
      ? body.attendance
      : null;
  if (!attendance) return badRequest('Valid attendance status is required.');

  const memberId = typeof body.memberId === 'string' ? body.memberId : null;
  const userId = typeof body.userId === 'string' ? body.userId : null;
  const participantId = typeof body.participantId === 'string' ? body.participantId : null;

  if (participantId) {
    const existing = await db.meetingParticipant.findFirst({
      where: { id: participantId, meetingId },
    });
    if (!existing) return notFound('Participant');
    const updated = await db.meetingParticipant.update({
      where: { id: participantId },
      data: {
        attendance,
        notes: typeof body.notes === 'string' ? body.notes : undefined,
        isEligible:
          typeof body.isEligible === 'boolean' ? body.isEligible : undefined,
      },
    });
    return success(updated, 'Attendance updated.');
  }

  if (!memberId && !userId) {
    return badRequest('memberId, userId, or participantId is required.');
  }

  const existing = memberId
    ? await db.meetingParticipant.findUnique({
        where: { meetingId_memberId: { meetingId, memberId } },
      })
    : userId
      ? await db.meetingParticipant.findUnique({
          where: { meetingId_userId: { meetingId, userId } },
        })
      : null;

  const row = existing
    ? await db.meetingParticipant.update({
        where: { id: existing.id },
        data: {
          attendance,
          notes: typeof body.notes === 'string' ? body.notes : undefined,
          isEligible:
            typeof body.isEligible === 'boolean' ? body.isEligible : undefined,
          displayName:
            typeof body.displayName === 'string' ? body.displayName : undefined,
        },
      })
    : await db.meetingParticipant.create({
        data: {
          meetingId,
          memberId,
          userId,
          displayName: typeof body.displayName === 'string' ? body.displayName : null,
          attendance,
          isEligible: typeof body.isEligible === 'boolean' ? body.isEligible : true,
          notes: typeof body.notes === 'string' ? body.notes : null,
        },
      });

  return success(row, existing ? 'Attendance updated.' : 'Participant added.', existing ? 200 : 201);
}
