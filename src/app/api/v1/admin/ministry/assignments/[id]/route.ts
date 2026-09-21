import { db } from '@/lib/db';
import { error, forbidden, notFound, success, validationError } from '@/lib/api/response';
import { guardAdminWrite } from '@/lib/admin/guard';
import { readJson } from '@/lib/auth/http';
import { sanitizePlainText } from '@/lib/content/sanitize';
import {
  canAccessAssignment,
  canManageAssignments,
} from '@/lib/volunteers/access';
import {
  assignmentWindow,
  detectOverlappingAssignments,
} from '@/lib/volunteers/conflicts';
import { assignmentInclude, serializeAssignment } from '@/lib/volunteers/serialize';
import { assignmentUpdateSchema, formatZodErrors } from '@/lib/volunteers/validation';
import type { ServiceAssignmentStatusValue } from '@/lib/volunteers/status';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await guardAdminWrite(request, 'ministries', 'assign');
  if (!auth.ok) return auth.error;
  if (!canManageAssignments(auth.user)) return forbidden();

  const parsed = assignmentUpdateSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const { id } = await context.params;
  const existing = await db.serviceAssignment.findUnique({
    where: { id },
    include: { ministry: { select: { id: true, leaderUserId: true } } },
  });
  if (!existing) return notFound('Service assignment');
  if (!canAccessAssignment(auth.user, existing)) return notFound('Service assignment');

  const scheduledAt =
    parsed.data.scheduledAt === undefined
      ? existing.scheduledAt
      : new Date(parsed.data.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime())) {
    return validationError({ scheduledAt: ['Invalid date'] });
  }

  const endsAt =
    parsed.data.endsAt === undefined
      ? existing.endsAt
      : parsed.data.endsAt
        ? new Date(parsed.data.endsAt)
        : null;
  if (endsAt && Number.isNaN(endsAt.getTime())) {
    return validationError({ endsAt: ['Invalid date'] });
  }

  const window = assignmentWindow(scheduledAt, endsAt);
  const overlaps = await detectOverlappingAssignments(
    existing.memberId,
    window.start,
    window.end,
    id
  );

  if (overlaps.length > 0 && !parsed.data.allowConflicts) {
    return error('This volunteer already has an overlapping service assignment.', 409);
  }

  const updated = await db.serviceAssignment.update({
    where: { id },
    data: {
      roleName:
        parsed.data.roleName === undefined
          ? undefined
          : sanitizePlainText(parsed.data.roleName, 120),
      scheduledAt: parsed.data.scheduledAt === undefined ? undefined : scheduledAt,
      endsAt: parsed.data.endsAt === undefined ? undefined : endsAt,
      status: parsed.data.status as ServiceAssignmentStatusValue | undefined,
      declineReason:
        parsed.data.declineReason === undefined
          ? undefined
          : parsed.data.declineReason
            ? sanitizePlainText(parsed.data.declineReason, 500)
            : null,
      ministryId: parsed.data.ministryId === undefined ? undefined : parsed.data.ministryId,
      teamId: parsed.data.teamId === undefined ? undefined : parsed.data.teamId,
    },
    include: assignmentInclude,
  });

  return success(
    {
      ...serializeAssignment({
        ...updated,
        hasConflictWarning: overlaps.length > 0,
      }),
      conflicts: overlaps.map((c) => ({
        id: c.id,
        roleName: c.roleName,
        scheduledAt: c.scheduledAt.toISOString(),
        endsAt: c.endsAt?.toISOString() ?? null,
        status: c.status,
      })),
    },
    overlaps.length > 0
      ? 'Assignment updated with conflict warning.'
      : 'Assignment updated.'
  );
}
