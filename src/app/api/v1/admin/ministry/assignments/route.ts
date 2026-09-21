import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import {
  error,
  forbidden,
  paginated,
  success,
  validationError,
} from '@/lib/api/response';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { readJson } from '@/lib/auth/http';
import {
  assignmentListWhere,
  canAccessMinistry,
  canManageAssignments,
  canViewVolunteers,
} from '@/lib/volunteers/access';
import { assignmentInclude, serializeAssignment } from '@/lib/volunteers/serialize';
import {
  assignmentCreateSchema,
  assignmentListSchema,
  formatZodErrors,
} from '@/lib/volunteers/validation';
import { createAssignment, VolunteerWriteError } from '@/lib/volunteers/write';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'ministries', 'view');
  if (!auth.ok) return auth.error;
  if (!canViewVolunteers(auth.user) && !canManageAssignments(auth.user)) {
    return forbidden();
  }

  const url = new URL(request.url);
  const parsed = assignmentListSchema.safeParse({
    q: url.searchParams.get('q') || undefined,
    page: url.searchParams.get('page') || 1,
    pageSize: url.searchParams.get('pageSize') || 20,
    ministryId: url.searchParams.get('ministryId') || undefined,
    memberId: url.searchParams.get('memberId') || undefined,
    eventId: url.searchParams.get('eventId') || undefined,
    teamId: url.searchParams.get('teamId') || undefined,
    status: url.searchParams.get('status') || undefined,
    from: url.searchParams.get('from') || undefined,
    to: url.searchParams.get('to') || undefined,
  });
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const { page, pageSize, ministryId, memberId, eventId, teamId, status, from, to, q } =
    parsed.data;
  const and: Prisma.ServiceAssignmentWhereInput[] = [assignmentListWhere(auth.user)];
  if (ministryId) and.push({ ministryId });
  if (memberId) and.push({ memberId });
  if (eventId) and.push({ eventId });
  if (teamId) and.push({ teamId });
  if (status) and.push({ status });
  if (from) {
    const date = new Date(from);
    if (!Number.isNaN(date.getTime())) and.push({ scheduledAt: { gte: date } });
  }
  if (to) {
    const date = new Date(to);
    if (!Number.isNaN(date.getTime())) and.push({ scheduledAt: { lte: date } });
  }
  if (q) {
    and.push({
      OR: [
        { roleName: { contains: q } },
        { member: { displayName: { contains: q } } },
        { event: { title: { contains: q } } },
      ],
    });
  }

  const where = { AND: and };
  const [totalItems, rows] = await Promise.all([
    db.serviceAssignment.count({ where }),
    db.serviceAssignment.findMany({
      where,
      include: assignmentInclude,
      orderBy: { scheduledAt: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return paginated(rows.map(serializeAssignment), { page, pageSize, totalItems });
}

export async function POST(request: Request) {
  const auth = await guardAdminWrite(request, 'ministries', 'assign');
  if (!auth.ok) return auth.error;
  if (!canManageAssignments(auth.user)) return forbidden();

  const parsed = assignmentCreateSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

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

  if (parsed.data.ministryId) {
    const ministry = await db.ministry.findUnique({
      where: { id: parsed.data.ministryId },
      select: { id: true, leaderUserId: true },
    });
    if (!ministry) return validationError({ ministryId: ['Ministry not found'] });
    if (!canAccessMinistry(auth.user, ministry)) return forbidden();
  }

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

    return success(
      {
        ...result.assignment,
        conflicts: result.conflicts.map((c) => ({
          id: c.id,
          roleName: c.roleName,
          scheduledAt: c.scheduledAt.toISOString(),
          endsAt: c.endsAt?.toISOString() ?? null,
          status: c.status,
        })),
      },
      result.hasConflictWarning
        ? 'Assignment created with conflict warning.'
        : 'Assignment created.',
      201
    );
  } catch (err) {
    if (err instanceof VolunteerWriteError && (err.code === 'conflict' || err.code === 'ineligible')) {
      return error(err.message, err.code === 'conflict' ? 409 : 400);
    }
    return error('Unable to create assignment.', 500);
  }
}
