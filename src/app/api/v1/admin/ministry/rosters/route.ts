import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { forbidden, paginated, validationError } from '@/lib/api/response';
import { guardAdminRead } from '@/lib/admin/guard';
import {
  assignmentListWhere,
  canManageAssignments,
  canViewVolunteers,
} from '@/lib/volunteers/access';
import { assignmentInclude, serializeAssignment } from '@/lib/volunteers/serialize';
import { formatZodErrors, rosterQuerySchema } from '@/lib/volunteers/validation';

/**
 * Service rosters — assignments scoped for ministry leaders.
 */
export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'ministries', 'view');
  if (!auth.ok) return auth.error;
  if (!canViewVolunteers(auth.user) && !canManageAssignments(auth.user)) {
    return forbidden();
  }

  const url = new URL(request.url);
  const parsed = rosterQuerySchema.safeParse({
    q: url.searchParams.get('q') || undefined,
    page: url.searchParams.get('page') || 1,
    pageSize: url.searchParams.get('pageSize') || 50,
    ministryId: url.searchParams.get('ministryId') || undefined,
    teamId: url.searchParams.get('teamId') || undefined,
    eventId: url.searchParams.get('eventId') || undefined,
    from: url.searchParams.get('from') || undefined,
    to: url.searchParams.get('to') || undefined,
  });
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const { page, pageSize, ministryId, teamId, eventId, from, to, q } = parsed.data;
  const and: Prisma.ServiceAssignmentWhereInput[] = [
    assignmentListWhere(auth.user),
    { status: { in: ['proposed', 'assigned', 'confirmed'] } },
  ];
  if (ministryId) and.push({ ministryId });
  if (teamId) and.push({ teamId });
  if (eventId) and.push({ eventId });
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
      orderBy: [{ scheduledAt: 'asc' }, { roleName: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return paginated(rows.map(serializeAssignment), { page, pageSize, totalItems });
}
