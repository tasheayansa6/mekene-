import { db } from '@/lib/db';
import { error, forbidden, success, validationError } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';
import { readJson, rejectIfCsrfInvalid } from '@/lib/auth/http';
import {
  canAccessMinistry,
  canManageAssignment,
  canManageAssignments,
} from '@/lib/volunteers/access';
import { assignmentCreateSchema, formatZodErrors } from '@/lib/volunteers/validation';
import { createAssignment, VolunteerWriteError } from '@/lib/volunteers/write';
import { volunteerLeaderScope } from '@/lib/volunteers/scope';

export async function POST(request: Request) {
  const csrfError = rejectIfCsrfInvalid(request);
  if (csrfError) return csrfError;
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const parsed = assignmentCreateSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const scope = await volunteerLeaderScope(auth.user);
  if (parsed.data.teamId && !scope.isGlobal && !scope.teamIds.includes(parsed.data.teamId)) {
    return forbidden();
  }
  if (parsed.data.ministryId) {
    const ministry = await db.ministry.findUnique({
      where: { id: parsed.data.ministryId },
      select: { id: true, leaderUserId: true },
    });
    if (!ministry) return validationError({ ministryId: ['Ministry not found'] });
    const team =
      parsed.data.teamId
        ? await db.ministryTeam.findUnique({
            where: { id: parsed.data.teamId },
            include: { ministry: { select: { id: true, leaderUserId: true } } },
          })
        : null;
    if (team && !canManageAssignment(auth.user, { ministry, team })) return forbidden();
    if (!team && !canAccessMinistry(auth.user, ministry) && !canManageAssignments(auth.user)) {
      return forbidden();
    }
  } else if (!scope.isGlobal && !canManageAssignments(auth.user) && scope.teamIds.length === 0) {
    return forbidden();
  }

  const event = await db.event.findUnique({
    where: { id: parsed.data.eventId },
    select: { id: true },
  });
  if (!event) return validationError({ eventId: ['Event not found'] });
  const member = await db.member.findUnique({
    where: { id: parsed.data.memberId },
    select: { id: true },
  });
  if (!member) return validationError({ memberId: ['Member not found'] });

  const scheduledAt = new Date(parsed.data.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime())) {
    return validationError({ scheduledAt: ['Invalid date'] });
  }
  const endsAt = parsed.data.endsAt ? new Date(parsed.data.endsAt) : null;
  if (endsAt && Number.isNaN(endsAt.getTime())) {
    return validationError({ endsAt: ['Invalid date'] });
  }

  try {
    const result = await createAssignment({
      eventId: parsed.data.eventId,
      memberId: parsed.data.memberId,
      ministryId: parsed.data.ministryId,
      teamId: parsed.data.teamId,
      roleId: parsed.data.roleId,
      roleName: parsed.data.roleName,
      scheduledAt,
      endsAt,
      status: parsed.data.status,
      createdById: auth.user.id,
      allowConflicts: parsed.data.allowConflicts,
      request,
    });
    return success(result.assignment, 'Assignment created.', 201);
  } catch (err) {
    if (err instanceof VolunteerWriteError) {
      return error(err.message, err.code === 'conflict' ? 409 : 400);
    }
    return error('Unable to create assignment.', 500);
  }
}
