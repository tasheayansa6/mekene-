import { db } from '@/lib/db';
import { badRequest, forbidden, paginated, success } from '@/lib/api/response';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { readJson } from '@/lib/auth/http';
import { canManageGovernance, canViewGovernance } from '@/lib/governance/access';
import { emitGovernanceEvent } from '@/lib/governance/events';
import { DECISION_STATUSES, isOneOf } from '@/lib/governance/status';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'governance', 'view');
  if (!auth.ok) return auth.error;
  if (!canViewGovernance(auth.user)) return forbidden();

  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get('page') || 1));
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize') || 20)));
  const status = url.searchParams.get('status') || undefined;
  const committeeId = url.searchParams.get('committeeId') || undefined;
  const meetingId = url.searchParams.get('meetingId') || undefined;

  const where = {
    ...(status && isOneOf(status, DECISION_STATUSES) ? { status } : {}),
    ...(committeeId ? { committeeId } : {}),
    ...(meetingId ? { meetingId } : {}),
  };

  const [totalItems, rows] = await Promise.all([
    db.governanceDecision.count({ where }),
    db.governanceDecision.findMany({
      where,
      orderBy: { decisionDate: 'desc' },
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
      agendaItemId: row.agendaItemId,
      committeeId: row.committeeId,
      decisionDate: row.decisionDate.toISOString(),
      createdById: row.createdById,
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

  const row = await db.governanceDecision.create({
    data: {
      title: body.title.trim(),
      description: typeof body.description === 'string' ? body.description : null,
      meetingId: typeof body.meetingId === 'string' ? body.meetingId : null,
      agendaItemId: typeof body.agendaItemId === 'string' ? body.agendaItemId : null,
      committeeId: typeof body.committeeId === 'string' ? body.committeeId : null,
      status:
        typeof body.status === 'string' && isOneOf(body.status, DECISION_STATUSES)
          ? body.status
          : 'proposed',
      decisionDate:
        typeof body.decisionDate === 'string'
          ? new Date(body.decisionDate)
          : new Date(),
      createdById: auth.user.id,
    },
  });

  await emitGovernanceEvent({
    type: 'decision_created',
    actorId: auth.user.id,
    entityId: row.id,
    request,
  });

  return success(
    {
      id: row.id,
      title: row.title,
      description: row.description,
      status: row.status,
      meetingId: row.meetingId,
      committeeId: row.committeeId,
      decisionDate: row.decisionDate.toISOString(),
    },
    'Decision created.',
    201
  );
}
