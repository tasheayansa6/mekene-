import { db } from '@/lib/db';
import { forbidden, success, validationError } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';
import { ACTIVE_ASSIGNMENT_STATUSES } from '@/lib/volunteers/status';
import { coverageQuerySchema, formatZodErrors } from '@/lib/volunteers/validation';
import { volunteerLeaderScope } from '@/lib/volunteers/scope';
import { canManageAssignments, canViewVolunteers } from '@/lib/volunteers/access';

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const scope = await volunteerLeaderScope(auth.user);
  if (!scope.isGlobal && scope.teamIds.length === 0 && !canViewVolunteers(auth.user) && !canManageAssignments(auth.user)) {
    return forbidden();
  }

  const url = new URL(request.url);
  const parsed = coverageQuerySchema.safeParse({
    eventId: url.searchParams.get('eventId') || undefined,
    ministryId: url.searchParams.get('ministryId') || undefined,
    teamId: url.searchParams.get('teamId') || undefined,
  });
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  if (parsed.data.teamId && !scope.isGlobal && !scope.teamIds.includes(parsed.data.teamId)) {
    return forbidden();
  }

  const roles = await db.volunteerRole.findMany({
    where: {
      isActive: true,
      ...(parsed.data.ministryId ? { ministryId: parsed.data.ministryId } : {}),
      ...(parsed.data.teamId ? { teamId: parsed.data.teamId } : {}),
      ...(!scope.isGlobal && !parsed.data.ministryId && !parsed.data.teamId
        ? { ministryId: { in: scope.ministryIds } }
        : {}),
    },
    orderBy: { sortOrder: 'asc' },
  });

  const assignments = await db.serviceAssignment.findMany({
    where: {
      eventId: parsed.data.eventId,
      status: { in: [...ACTIVE_ASSIGNMENT_STATUSES] },
      ...(parsed.data.ministryId ? { ministryId: parsed.data.ministryId } : {}),
      ...(parsed.data.teamId ? { teamId: parsed.data.teamId } : {}),
    },
    select: { roleId: true, roleName: true },
  });

  const coverage = roles.map((role) => {
    const assigned = assignments.filter(
      (row) => row.roleId === role.id || row.roleName.toLowerCase() === role.name.toLowerCase()
    ).length;
    return {
      roleId: role.id,
      name: role.name,
      required: role.slotsRequired,
      assigned,
      open: Math.max(0, role.slotsRequired - assigned),
    };
  });

  return success({ coverage });
}
