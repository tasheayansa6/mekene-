import { db } from '@/lib/db';
import { forbidden, paginated, success, validationError } from '@/lib/api/response';
import { enforceAdminRateLimit, guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { readJson } from '@/lib/auth/http';
import {
  canAccessCase,
  canManageFollowUps,
  canViewPastoral,
  followUpListWhere,
} from '@/lib/pastoral/access';
import { logPastoralAccess } from '@/lib/pastoral/audit';
import { serializeFollowUp } from '@/lib/pastoral/serialize';
import {
  formatZodErrors,
  pastoralFollowUpCreateSchema,
  pastoralFollowUpListSchema,
} from '@/lib/pastoral/validation';
import { createFollowUp } from '@/lib/pastoral/write';

const followUpInclude = {
  assignedTo: { select: { id: true, firstName: true, lastName: true } },
  createdBy: { select: { id: true, firstName: true, lastName: true } },
} as const;

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'pastoral', 'view');
  if (!auth.ok) return auth.error;
  if (!canViewPastoral(auth.user)) return forbidden();
  const limited = enforceAdminRateLimit(request, auth.user.id, 'pastoral-followups');
  if (limited) return limited;

  const url = new URL(request.url);
  const parsed = pastoralFollowUpListSchema.safeParse({
    q: url.searchParams.get('q') || undefined,
    page: url.searchParams.get('page') || 1,
    pageSize: url.searchParams.get('pageSize') || 20,
    status: url.searchParams.get('status') || undefined,
    memberId: url.searchParams.get('memberId') || undefined,
    caseId: url.searchParams.get('caseId') || undefined,
    assignedTo: url.searchParams.get('assignedTo') || undefined,
    due: url.searchParams.get('due') || undefined,
    sort: url.searchParams.get('sort') || undefined,
    dir: url.searchParams.get('dir') || undefined,
  });
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const { page, pageSize, status, memberId, caseId, assignedTo, due, sort, dir } = parsed.data;
  const and: object[] = [followUpListWhere(auth.user)];
  if (status) and.push({ status });
  if (memberId) and.push({ memberId });
  if (caseId) and.push({ caseId });
  if (assignedTo === 'unassigned') and.push({ assignedToId: null });
  else if (assignedTo) and.push({ assignedToId: assignedTo });
  if (due === 'overdue') {
    and.push({
      status: { in: ['pending', 'in_progress'] },
      dueDate: { lt: new Date() },
    });
  } else if (due === 'upcoming') {
    and.push({
      status: { in: ['pending', 'in_progress'] },
      dueDate: { gte: new Date(), lte: new Date(Date.now() + 7 * 24 * 60 * 60_000) },
    });
  }

  const where = { AND: and };
  const orderField = ['dueDate', 'status', 'createdAt', 'updatedAt'].includes(sort || '')
    ? sort!
    : 'dueDate';

  const [totalItems, rows] = await Promise.all([
    db.pastoralFollowUp.count({ where }),
    db.pastoralFollowUp.findMany({
      where,
      include: followUpInclude,
      orderBy: { [orderField]: dir === 'asc' ? 'asc' : 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  await logPastoralAccess({
    actorId: auth.user.id,
    resource: 'pastoral_followup',
    action: 'list',
    request,
  });

  return paginated(
    rows.map(serializeFollowUp),
    { page, pageSize, totalItems }
  );
}

export async function POST(request: Request) {
  const auth = await guardAdminWrite(request, 'pastoral', 'create');
  if (!auth.ok) return auth.error;
  if (!canManageFollowUps(auth.user)) return forbidden();

  const parsed = pastoralFollowUpCreateSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  if (parsed.data.caseId) {
    const careCase = await db.pastoralCareCase.findUnique({
      where: { id: parsed.data.caseId },
      select: { id: true, assignedToId: true, createdById: true, memberId: true },
    });
    if (!careCase) return validationError({ caseId: ['Case not found'] });
    if (!canAccessCase(auth.user, careCase)) return forbidden();
  }

  let dueDate: Date | null = null;
  if (parsed.data.dueDate) {
    dueDate = new Date(parsed.data.dueDate);
    if (Number.isNaN(dueDate.getTime())) {
      return validationError({ dueDate: ['Invalid date'] });
    }
  }

  const row = await createFollowUp({
    caseId: parsed.data.caseId,
    memberId: parsed.data.memberId,
    assignedToId: parsed.data.assignedToId,
    createdById: auth.user.id,
    task: parsed.data.task,
    dueDate,
    status: parsed.data.status,
    request,
  });

  await logPastoralAccess({
    actorId: auth.user.id,
    resource: 'pastoral_followup',
    resourceId: row.id,
    action: 'create',
    request,
  });

  return success(serializeFollowUp(row), 'Follow-up created.', 201);
}
