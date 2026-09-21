import { db } from '@/lib/db';
import { badRequest, forbidden, notFound, success } from '@/lib/api/response';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { readJson } from '@/lib/auth/http';
import {
  canManageCommittee,
  canViewCommittee,
} from '@/lib/governance/access';
import { serializeCommittee } from '@/lib/governance/serialize';

async function loadMembership(committeeId: string, userId: string) {
  const member = await db.member.findFirst({
    where: { userId },
    select: { id: true },
  });
  if (!member) return { isActiveMember: false };
  const row = await db.committeeMember.findFirst({
    where: { committeeId, memberId: member.id, status: 'active' },
    select: { id: true },
  });
  return { isActiveMember: Boolean(row) };
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await guardAdminRead(request, 'governance', 'view');
  if (!auth.ok) return auth.error;

  const { id } = await context.params;
  const committee = await db.committee.findUnique({
    where: { id },
    include: { _count: { select: { members: true, meetings: true } } },
  });
  if (!committee) return notFound('Committee');

  const { isActiveMember } = await loadMembership(id, auth.user.id);
  if (
    !canViewCommittee(auth.user, committee, {
      isActiveMember,
      adminListScope: true,
    })
  ) {
    return forbidden();
  }

  return success(serializeCommittee(committee));
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await guardAdminWrite(request, 'governance', 'update');
  if (!auth.ok) return auth.error;

  const { id } = await context.params;
  const committee = await db.committee.findUnique({ where: { id } });
  if (!committee) return notFound('Committee');
  if (!canManageCommittee(auth.user, committee)) return forbidden();

  const body = (await readJson(request)) as Record<string, unknown> | null;
  if (!body) return badRequest('Invalid body.');

  const data: Record<string, unknown> = {};
  if (typeof body.name === 'string') data.name = body.name.trim();
  if (typeof body.description === 'string' || body.description === null) {
    data.description = body.description;
  }
  if (typeof body.responsibilities === 'string' || body.responsibilities === null) {
    data.responsibilities = body.responsibilities;
  }
  if (typeof body.ministryId === 'string' || body.ministryId === null) {
    data.ministryId = body.ministryId;
  }
  if (typeof body.quorumCount === 'number' || body.quorumCount === null) {
    data.quorumCount = body.quorumCount;
  }
  if (typeof body.quorumPercent === 'number' || body.quorumPercent === null) {
    data.quorumPercent = body.quorumPercent;
  }
  if (typeof body.termMonths === 'number' || body.termMonths === null) {
    data.termMonths = body.termMonths;
  }
  if (typeof body.chairUserId === 'string' || body.chairUserId === null) {
    data.chairUserId = body.chairUserId;
  }
  if (typeof body.secretaryUserId === 'string' || body.secretaryUserId === null) {
    data.secretaryUserId = body.secretaryUserId;
  }
  if (typeof body.status === 'string') data.status = body.status;
  if (typeof body.isActive === 'boolean') data.isActive = body.isActive;

  const updated = await db.committee.update({
    where: { id },
    data,
    include: { _count: { select: { members: true, meetings: true } } },
  });

  return success(serializeCommittee(updated), 'Committee updated.');
}
