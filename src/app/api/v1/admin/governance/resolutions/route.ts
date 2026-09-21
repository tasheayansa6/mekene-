import { db } from '@/lib/db';
import { badRequest, forbidden, paginated, success } from '@/lib/api/response';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { readJson } from '@/lib/auth/http';
import { canManageGovernance, canViewGovernance } from '@/lib/governance/access';
import { emitGovernanceEvent } from '@/lib/governance/events';
import { isOneOf, RESOLUTION_STATUSES } from '@/lib/governance/status';
import { nextResolutionNumber } from '@/lib/governance/write';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'governance', 'view');
  if (!auth.ok) return auth.error;
  if (!canViewGovernance(auth.user)) return forbidden();

  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get('page') || 1));
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize') || 20)));
  const status = url.searchParams.get('status') || undefined;
  const meetingId = url.searchParams.get('meetingId') || undefined;

  const where = {
    ...(status && isOneOf(status, RESOLUTION_STATUSES) ? { status } : {}),
    ...(meetingId ? { meetingId } : {}),
  };

  const [totalItems, rows] = await Promise.all([
    db.resolution.count({ where }),
    db.resolution.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return paginated(
    rows.map((row) => ({
      id: row.id,
      resolutionNumber: row.resolutionNumber,
      title: row.title,
      description: row.description,
      status: row.status,
      meetingId: row.meetingId,
      decidedAt: row.decidedAt?.toISOString() ?? null,
      createdById: row.createdById,
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

  const resolutionNumber = await nextResolutionNumber();
  const row = await db.resolution.create({
    data: {
      resolutionNumber,
      title: body.title.trim(),
      description: typeof body.description === 'string' ? body.description : null,
      meetingId: typeof body.meetingId === 'string' ? body.meetingId : null,
      status:
        typeof body.status === 'string' && isOneOf(body.status, RESOLUTION_STATUSES)
          ? body.status
          : 'draft',
      createdById: auth.user.id,
    },
  });

  if (row.status === 'approved') {
    await emitGovernanceEvent({
      type: 'resolution_approved',
      actorId: auth.user.id,
      entityId: row.id,
      request,
    });
  }

  return success(
    {
      id: row.id,
      resolutionNumber: row.resolutionNumber,
      title: row.title,
      description: row.description,
      status: row.status,
      meetingId: row.meetingId,
    },
    'Resolution created.',
    201
  );
}
