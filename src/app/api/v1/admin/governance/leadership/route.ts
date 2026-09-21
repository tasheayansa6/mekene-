import { db } from '@/lib/db';
import {
  badRequest,
  forbidden,
  notFound,
  paginated,
  success,
} from '@/lib/api/response';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { readJson } from '@/lib/auth/http';
import { canManageGovernance, canViewGovernance } from '@/lib/governance/access';
import { emitGovernanceEvent } from '@/lib/governance/events';
import { serializeAppointment } from '@/lib/governance/serialize';
import { computeTermEnd } from '@/lib/governance/write';

const appointmentInclude = {
  position: { select: { id: true, title: true, termMonths: true } },
  member: {
    select: {
      id: true,
      displayName: true,
      user: { select: { firstName: true, lastName: true, email: true } },
    },
  },
} as const;

function mapAppointment(row: {
  id: string;
  positionId: string;
  memberId: string;
  startAt: Date;
  endAt: Date | null;
  status: string;
  organizationLabel: string | null;
  notes: string | null;
  position: { id: string; title: string; termMonths: number | null } | null;
  member: {
    id: string;
    displayName: string | null;
    user: { firstName: string; lastName: string; email: string } | null;
  } | null;
}) {
  return serializeAppointment({
    ...row,
    member: row.member
      ? {
          id: row.member.id,
          firstName: row.member.user?.firstName ?? row.member.displayName,
          lastName: row.member.user?.lastName ?? null,
          email: row.member.user?.email ?? null,
        }
      : null,
  });
}

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'governance', 'view');
  if (!auth.ok) return auth.error;
  if (!canViewGovernance(auth.user)) return forbidden();

  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get('page') || 1));
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize') || 20)));
  const status = url.searchParams.get('status') || 'active';

  const where = status === 'all' ? {} : { status: status as 'active' | 'ended' | 'replaced' };

  const [totalItems, rows] = await Promise.all([
    db.governanceAppointment.count({ where }),
    db.governanceAppointment.findMany({
      where,
      include: appointmentInclude,
      orderBy: { startAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return paginated(rows.map(mapAppointment), { page, pageSize, totalItems });
}

export async function POST(request: Request) {
  const auth = await guardAdminWrite(request, 'governance', 'create');
  if (!auth.ok) return auth.error;
  if (!canManageGovernance(auth.user)) return forbidden();

  const body = (await readJson(request)) as Record<string, unknown> | null;
  if (!body || typeof body.memberId !== 'string' || typeof body.positionId !== 'string') {
    return badRequest('memberId and positionId are required.');
  }
  if (typeof body.startAt !== 'string') {
    return badRequest('startAt is required.');
  }

  const startAt = new Date(body.startAt);
  if (Number.isNaN(startAt.getTime())) return badRequest('Invalid startAt.');

  const [member, position] = await Promise.all([
    db.member.findUnique({ where: { id: body.memberId }, select: { id: true } }),
    db.leadershipPosition.findUnique({
      where: { id: body.positionId },
      select: { id: true, termMonths: true },
    }),
  ]);
  if (!member) return notFound('Member');
  if (!position) return notFound('Position');

  let endAt: Date | null = null;
  if (typeof body.endAt === 'string' && body.endAt) {
    endAt = new Date(body.endAt);
    if (Number.isNaN(endAt.getTime())) return badRequest('Invalid endAt.');
  } else {
    endAt = computeTermEnd(startAt, position.termMonths);
  }

  const row = await db.governanceAppointment.create({
    data: {
      memberId: body.memberId,
      positionId: body.positionId,
      startAt,
      endAt,
      organizationLabel:
        typeof body.organizationLabel === 'string' ? body.organizationLabel : null,
      notes: typeof body.notes === 'string' ? body.notes : null,
      appointedById: auth.user.id,
      status: 'active',
    },
    include: appointmentInclude,
  });

  await emitGovernanceEvent({
    type: 'leadership_appointed',
    actorId: auth.user.id,
    entityId: row.id,
    request,
    details: { memberId: row.memberId, positionId: row.positionId },
  });

  return success(mapAppointment(row), 'Appointment created.', 201);
}
