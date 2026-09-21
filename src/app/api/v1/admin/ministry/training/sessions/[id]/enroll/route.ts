import { db } from '@/lib/db';
import { error, forbidden, notFound, success, validationError } from '@/lib/api/response';
import { guardAdminWrite } from '@/lib/admin/guard';
import { readJson } from '@/lib/auth/http';
import {
  canAccessMinistry,
  canManageAssignments,
} from '@/lib/volunteers/access';
import { serializeEnrollment } from '@/lib/volunteers/serialize';
import { formatZodErrors, trainingEnrollSchema } from '@/lib/volunteers/validation';
import { enrollTraining, VolunteerWriteError } from '@/lib/volunteers/write';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await guardAdminWrite(request, 'ministries', 'assign');
  if (!auth.ok) return auth.error;
  if (!canManageAssignments(auth.user)) return forbidden();

  const parsed = trainingEnrollSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const { id: sessionId } = await context.params;
  const session = await db.trainingSession.findUnique({
    where: { id: sessionId },
    include: {
      program: {
        include: { ministry: { select: { id: true, leaderUserId: true } } },
      },
    },
  });
  if (!session) return notFound('Training session');
  if (
    session.program.ministry &&
    !canAccessMinistry(auth.user, session.program.ministry)
  ) {
    return notFound('Training session');
  }

  const member = await db.member.findUnique({
    where: { id: parsed.data.memberId },
    select: { id: true },
  });
  if (!member) return validationError({ memberId: ['Member not found'] });

  try {
    const result = await enrollTraining({
      sessionId,
      memberId: parsed.data.memberId,
      actorId: auth.user.id,
      request,
    });

    if (result.kind === 'enrolled' || result.kind === 'already_enrolled') {
      return success(
        {
          kind: result.kind,
          enrollment: serializeEnrollment(result.enrollment),
        },
        result.kind === 'already_enrolled' ? 'Already enrolled.' : 'Member enrolled.',
        result.kind === 'already_enrolled' ? 200 : 201
      );
    }

    return success(
      {
        kind: result.kind,
        waitlist: {
          id: result.waitlist.id,
          sessionId: result.waitlist.sessionId,
          memberId: result.waitlist.memberId,
          position: result.waitlist.position,
        },
      },
      result.kind === 'already_waitlisted'
        ? 'Already on waitlist.'
        : 'Session full — added to waitlist.',
      result.kind === 'already_waitlisted' ? 200 : 201
    );
  } catch (err) {
    if (err instanceof VolunteerWriteError && err.code === 'not_found') {
      return notFound('Training session');
    }
    return error('Unable to enroll member.', 500);
  }
}
