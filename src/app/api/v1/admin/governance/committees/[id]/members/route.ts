import { db } from '@/lib/db';
import { badRequest, conflict, forbidden, notFound, success } from '@/lib/api/response';
import { guardAdminWrite } from '@/lib/admin/guard';
import { readJson } from '@/lib/auth/http';
import { canManageCommittee } from '@/lib/governance/access';
import { emitGovernanceEvent } from '@/lib/governance/events';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await guardAdminWrite(request, 'governance', 'update');
  if (!auth.ok) return auth.error;

  const { id: committeeId } = await context.params;
  const committee = await db.committee.findUnique({ where: { id: committeeId } });
  if (!committee) return notFound('Committee');
  if (!canManageCommittee(auth.user, committee)) return forbidden();

  const body = (await readJson(request)) as Record<string, unknown> | null;
  if (!body) return badRequest('Invalid body.');

  if (body.action === 'remove') {
    const memberId =
      typeof body.memberId === 'string'
        ? body.memberId
        : typeof body.id === 'string'
          ? body.id
          : null;
    if (!memberId) return badRequest('memberId is required to remove.');

    const existing = await db.committeeMember.findUnique({
      where: { committeeId_memberId: { committeeId, memberId } },
    });
    if (!existing) return notFound('Committee member');

    const updated = await db.committeeMember.update({
      where: { id: existing.id },
      data: { status: 'removed', endAt: new Date() },
    });

    await emitGovernanceEvent({
      type: 'committee_member_removed',
      actorId: auth.user.id,
      entityId: updated.id,
      request,
      details: { committeeId, memberId },
    });

    return success(
      {
        id: updated.id,
        committeeId: updated.committeeId,
        memberId: updated.memberId,
        status: updated.status,
      },
      'Member removed.'
    );
  }

  if (typeof body.memberId !== 'string') {
    return badRequest('memberId is required.');
  }

  const member = await db.member.findUnique({
    where: { id: body.memberId },
    select: { id: true },
  });
  if (!member) return notFound('Member');

  const existing = await db.committeeMember.findUnique({
    where: {
      committeeId_memberId: { committeeId, memberId: body.memberId },
    },
  });
  if (existing && existing.status === 'active') {
    return conflict('Member is already on this committee.');
  }

  const row = existing
    ? await db.committeeMember.update({
        where: { id: existing.id },
        data: {
          status: 'active',
          endAt: null,
          startAt: new Date(),
          roleLabel:
            typeof body.roleLabel === 'string' ? body.roleLabel : existing.roleLabel,
        },
      })
    : await db.committeeMember.create({
        data: {
          committeeId,
          memberId: body.memberId,
          roleLabel: typeof body.roleLabel === 'string' ? body.roleLabel : 'member',
        },
      });

  await emitGovernanceEvent({
    type: 'committee_member_added',
    actorId: auth.user.id,
    entityId: row.id,
    request,
    details: { committeeId, memberId: body.memberId },
  });

  return success(
    {
      id: row.id,
      committeeId: row.committeeId,
      memberId: row.memberId,
      roleLabel: row.roleLabel,
      status: row.status,
    },
    'Member added.',
    201
  );
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await guardAdminWrite(request, 'governance', 'update');
  if (!auth.ok) return auth.error;

  const { id: committeeId } = await context.params;
  const committee = await db.committee.findUnique({ where: { id: committeeId } });
  if (!committee) return notFound('Committee');
  if (!canManageCommittee(auth.user, committee)) return forbidden();

  const url = new URL(request.url);
  const memberId = url.searchParams.get('memberId');
  if (!memberId) return badRequest('memberId query param is required.');

  const existing = await db.committeeMember.findUnique({
    where: { committeeId_memberId: { committeeId, memberId } },
  });
  if (!existing) return notFound('Committee member');

  const updated = await db.committeeMember.update({
    where: { id: existing.id },
    data: { status: 'removed', endAt: new Date() },
  });

  await emitGovernanceEvent({
    type: 'committee_member_removed',
    actorId: auth.user.id,
    entityId: updated.id,
    request,
    details: { committeeId, memberId },
  });

  return success(
    {
      id: updated.id,
      committeeId: updated.committeeId,
      memberId: updated.memberId,
      status: updated.status,
    },
    'Member removed.'
  );
}
