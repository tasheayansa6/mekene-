import { db } from '@/lib/db';
import { badRequest, forbidden, paginated, success } from '@/lib/api/response';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { readJson } from '@/lib/auth/http';
import { canManageGovernance, canViewGovernance } from '@/lib/governance/access';
import { emitGovernanceEvent } from '@/lib/governance/events';
import { ACTION_ITEM_STATUSES, isOneOf } from '@/lib/governance/status';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'governance', 'view');
  if (!auth.ok) return auth.error;
  if (!canViewGovernance(auth.user)) return forbidden();

  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get('page') || 1));
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize') || 20)));
  const status = url.searchParams.get('status') || undefined;
  const committeeId = url.searchParams.get('committeeId') || undefined;
  const assigneeUserId = url.searchParams.get('assigneeUserId') || undefined;

  const where = {
    ...(status && isOneOf(status, ACTION_ITEM_STATUSES) ? { status } : {}),
    ...(committeeId ? { committeeId } : {}),
    ...(assigneeUserId ? { assigneeUserId } : {}),
  };

  const [totalItems, rows] = await Promise.all([
    db.governanceActionItem.count({ where }),
    db.governanceActionItem.findMany({
      where,
      orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return paginated(
    rows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      status: row.status,
      meetingId: row.meetingId,
      decisionId: row.decisionId,
      committeeId: row.committeeId,
      ownerMemberId: row.ownerMemberId,
      assigneeUserId: row.assigneeUserId,
      volunteerTaskId: row.volunteerTaskId,
      dueAt: row.dueAt?.toISOString() ?? null,
      priority: row.priority,
      createdAt: row.createdAt.toISOString(),
    })),
    { page, pageSize, totalItems }
  );
}

export async function POST(request: Request) {
  const auth = await guardAdminWrite(request, 'governance', 'create');
  if (!auth.ok) return auth.error;
  if (!canManageGovernance(auth.user)) return forbidden();

  const body = (await readJson(request)) as Record<string, unknown> | null;
  if (!body || typeof body.title !== 'string' || !body.title.trim()) {
    return badRequest('title is required.');
  }

  const assigneeUserId =
    typeof body.assigneeUserId === 'string' ? body.assigneeUserId : null;
  const ownerMemberId =
    typeof body.ownerMemberId === 'string' ? body.ownerMemberId : null;
  const dueAt =
    typeof body.dueAt === 'string' && body.dueAt ? new Date(body.dueAt) : null;

  const task = await db.volunteerTask.create({
    data: {
      title: body.title.trim(),
      description: typeof body.description === 'string' ? body.description : null,
      assigneeId: assigneeUserId,
      memberId: ownerMemberId,
      dueAt,
      createdById: auth.user.id,
      status: 'todo',
    },
  });

  const row = await db.governanceActionItem.create({
    data: {
      title: body.title.trim(),
      description: typeof body.description === 'string' ? body.description : null,
      meetingId: typeof body.meetingId === 'string' ? body.meetingId : null,
      decisionId: typeof body.decisionId === 'string' ? body.decisionId : null,
      committeeId: typeof body.committeeId === 'string' ? body.committeeId : null,
      ownerMemberId,
      assigneeUserId,
      volunteerTaskId: task.id,
      dueAt,
      priority: typeof body.priority === 'number' ? body.priority : 0,
      status:
        typeof body.status === 'string' && isOneOf(body.status, ACTION_ITEM_STATUSES)
          ? body.status
          : 'open',
    },
  });

  await emitGovernanceEvent({
    type: 'action_item_assigned',
    actorId: auth.user.id,
    entityId: row.id,
    recipientUserId: assigneeUserId,
    request,
    relatedUrl: '/leadership',
  });

  return success(
    {
      id: row.id,
      title: row.title,
      description: row.description,
      status: row.status,
      assigneeUserId: row.assigneeUserId,
      volunteerTaskId: row.volunteerTaskId,
      dueAt: row.dueAt?.toISOString() ?? null,
    },
    'Action item created.',
    201
  );
}
