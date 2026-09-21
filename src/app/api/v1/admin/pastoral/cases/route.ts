import { db } from '@/lib/db';
import { forbidden, paginated, success, validationError } from '@/lib/api/response';
import { enforceAdminRateLimit, guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { readJson } from '@/lib/auth/http';
import {
  canCreatePastoral,
  canViewPastoral,
  caseListWhere,
} from '@/lib/pastoral/access';
import { logPastoralAccess } from '@/lib/pastoral/audit';
import { pastoralCaseListInclude, serializeCase } from '@/lib/pastoral/serialize';
import {
  formatZodErrors,
  pastoralCaseCreateSchema,
  pastoralCaseListSchema,
} from '@/lib/pastoral/validation';
import { createCase } from '@/lib/pastoral/write';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'pastoral', 'view');
  if (!auth.ok) return auth.error;
  if (!canViewPastoral(auth.user)) return forbidden();
  const limited = enforceAdminRateLimit(request, auth.user.id, 'pastoral-cases');
  if (limited) return limited;

  const url = new URL(request.url);
  const parsed = pastoralCaseListSchema.safeParse({
    q: url.searchParams.get('q') || undefined,
    page: url.searchParams.get('page') || 1,
    pageSize: url.searchParams.get('pageSize') || 20,
    status: url.searchParams.get('status') || undefined,
    priority: url.searchParams.get('priority') || undefined,
    categoryId: url.searchParams.get('categoryId') || undefined,
    memberId: url.searchParams.get('memberId') || undefined,
    assignedTo: url.searchParams.get('assignedTo') || undefined,
    from: url.searchParams.get('from') || undefined,
    to: url.searchParams.get('to') || undefined,
    sort: url.searchParams.get('sort') || undefined,
    dir: url.searchParams.get('dir') || undefined,
  });
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const { q, page, pageSize, status, priority, categoryId, memberId, assignedTo, from, to, sort, dir } =
    parsed.data;
  const and: object[] = [caseListWhere(auth.user)];
  if (q) {
    and.push({
      OR: [
        { title: { contains: q } },
        { member: { displayName: { contains: q } } },
        { member: { membershipNumber: { contains: q } } },
      ],
    });
  }
  if (status) and.push({ status });
  if (priority) and.push({ priority });
  if (categoryId) and.push({ categoryId });
  if (memberId) and.push({ memberId });
  if (assignedTo === 'unassigned') and.push({ assignedToId: null });
  else if (assignedTo) and.push({ assignedToId: assignedTo });
  if (from) {
    const date = new Date(from);
    if (!Number.isNaN(date.getTime())) and.push({ openedAt: { gte: date } });
  }
  if (to) {
    const date = new Date(to);
    if (!Number.isNaN(date.getTime())) and.push({ openedAt: { lte: date } });
  }

  const where = { AND: and };
  const orderField = ['title', 'status', 'priority', 'openedAt', 'updatedAt', 'createdAt'].includes(
    sort || ''
  )
    ? sort!
    : 'updatedAt';

  const [totalItems, rows] = await Promise.all([
    db.pastoralCareCase.count({ where }),
    db.pastoralCareCase.findMany({
      where,
      include: pastoralCaseListInclude,
      orderBy: { [orderField]: dir === 'asc' ? 'asc' : 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  await logPastoralAccess({
    actorId: auth.user.id,
    resource: 'pastoral_case',
    action: 'list',
    request,
  });

  return paginated(
    rows.map((row) => serializeCase(row)),
    { page, pageSize, totalItems }
  );
}

export async function POST(request: Request) {
  const auth = await guardAdminWrite(request, 'pastoral', 'create');
  if (!auth.ok) return auth.error;
  if (!canCreatePastoral(auth.user)) return forbidden();

  const parsed = pastoralCaseCreateSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const member = await db.member.findUnique({
    where: { id: parsed.data.memberId },
    select: { id: true },
  });
  if (!member) return validationError({ memberId: ['Member not found'] });

  if (parsed.data.assignedToId) {
    const assignee = await db.user.findUnique({
      where: { id: parsed.data.assignedToId },
      select: { id: true },
    });
    if (!assignee) return validationError({ assignedToId: ['Assignee not found'] });
  }

  const row = await createCase({
    ...parsed.data,
    createdById: auth.user.id,
    request,
  });

  await logPastoralAccess({
    actorId: auth.user.id,
    resource: 'pastoral_case',
    resourceId: row.id,
    action: 'create',
    request,
  });

  return success(serializeCase(row), 'Pastoral care case created.', 201);
}
