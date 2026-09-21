import { db } from '@/lib/db';
import { forbidden, paginated, success, validationError } from '@/lib/api/response';
import { enforceAdminRateLimit, guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { readJson } from '@/lib/auth/http';
import {
  canAccessCase,
  canManageVisits,
  canViewPastoral,
  visitListWhere,
} from '@/lib/pastoral/access';
import { logPastoralAccess } from '@/lib/pastoral/audit';
import { serializeVisit } from '@/lib/pastoral/serialize';
import {
  formatZodErrors,
  pastoralVisitCreateSchema,
  pastoralVisitListSchema,
} from '@/lib/pastoral/validation';
import { createVisit } from '@/lib/pastoral/write';

const visitInclude = {
  assignedTo: { select: { id: true, firstName: true, lastName: true } },
  createdBy: { select: { id: true, firstName: true, lastName: true } },
  member: {
    select: {
      id: true,
      membershipNumber: true,
      displayName: true,
      user: { select: { firstName: true, lastName: true } },
    },
  },
} as const;

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'pastoral', 'view');
  if (!auth.ok) return auth.error;
  if (!canViewPastoral(auth.user)) return forbidden();
  const limited = enforceAdminRateLimit(request, auth.user.id, 'pastoral-visits');
  if (limited) return limited;

  const url = new URL(request.url);
  const parsed = pastoralVisitListSchema.safeParse({
    q: url.searchParams.get('q') || undefined,
    page: url.searchParams.get('page') || 1,
    pageSize: url.searchParams.get('pageSize') || 20,
    status: url.searchParams.get('status') || undefined,
    memberId: url.searchParams.get('memberId') || undefined,
    caseId: url.searchParams.get('caseId') || undefined,
    assignedTo: url.searchParams.get('assignedTo') || undefined,
    from: url.searchParams.get('from') || undefined,
    to: url.searchParams.get('to') || undefined,
    sort: url.searchParams.get('sort') || undefined,
    dir: url.searchParams.get('dir') || undefined,
  });
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const { page, pageSize, status, memberId, caseId, assignedTo, from, to, sort, dir } = parsed.data;
  const and: object[] = [visitListWhere(auth.user)];
  if (status) and.push({ status });
  if (memberId) and.push({ memberId });
  if (caseId) and.push({ caseId });
  if (assignedTo === 'unassigned') and.push({ assignedToId: null });
  else if (assignedTo) and.push({ assignedToId: assignedTo });
  if (from) {
    const date = new Date(from);
    if (!Number.isNaN(date.getTime())) and.push({ scheduledAt: { gte: date } });
  }
  if (to) {
    const date = new Date(to);
    if (!Number.isNaN(date.getTime())) and.push({ scheduledAt: { lte: date } });
  }

  const where = { AND: and };
  const orderField = ['scheduledAt', 'status', 'createdAt', 'updatedAt'].includes(sort || '')
    ? sort!
    : 'scheduledAt';

  const [totalItems, rows] = await Promise.all([
    db.pastoralVisit.count({ where }),
    db.pastoralVisit.findMany({
      where,
      include: visitInclude,
      orderBy: { [orderField]: dir === 'asc' ? 'asc' : 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  await logPastoralAccess({
    actorId: auth.user.id,
    resource: 'pastoral_visit',
    action: 'list',
    request,
  });

  return paginated(
    rows.map(serializeVisit),
    { page, pageSize, totalItems }
  );
}

export async function POST(request: Request) {
  const auth = await guardAdminWrite(request, 'pastoral', 'create');
  if (!auth.ok) return auth.error;
  if (!canManageVisits(auth.user)) return forbidden();

  const parsed = pastoralVisitCreateSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const member = await db.member.findUnique({
    where: { id: parsed.data.memberId },
    select: { id: true },
  });
  if (!member) return validationError({ memberId: ['Member not found'] });

  if (parsed.data.caseId) {
    const careCase = await db.pastoralCareCase.findUnique({
      where: { id: parsed.data.caseId },
      select: { id: true, assignedToId: true, createdById: true },
    });
    if (!careCase) return validationError({ caseId: ['Case not found'] });
    if (!canAccessCase(auth.user, careCase)) return forbidden();
  }

  const scheduledAt = new Date(parsed.data.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime())) {
    return validationError({ scheduledAt: ['Invalid date'] });
  }

  const row = await createVisit({
    memberId: parsed.data.memberId,
    caseId: parsed.data.caseId,
    assignedToId: parsed.data.assignedToId,
    createdById: auth.user.id,
    scheduledAt,
    status: parsed.data.status,
    locationType: parsed.data.locationType,
    locationNote: parsed.data.locationNote,
    notes: parsed.data.notes,
    request,
  });

  await logPastoralAccess({
    actorId: auth.user.id,
    resource: 'pastoral_visit',
    resourceId: row.id,
    action: 'create',
    request,
  });

  return success(serializeVisit(row), 'Visit scheduled.', 201);
}
