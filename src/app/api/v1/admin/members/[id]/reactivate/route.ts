import { db } from '@/lib/db';
import { error, forbidden, notFound, success } from '@/lib/api/response';
import { guardAdminWrite } from '@/lib/admin/guard';
import { canArchiveMembers, memberByIdWhere } from '@/lib/members/access';
import { canTransitionMembership } from '@/lib/members/status';
import { recordStatusHistory } from '@/lib/members/write';
import { emitMembershipEvent } from '@/lib/members/events';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const auth = await guardAdminWrite(request, 'members', 'archive');
  if (!auth.ok) return auth.error;
  if (!canArchiveMembers(auth.user)) return forbidden();
  const { id } = await context.params;
  const member = await db.member.findFirst({ where: memberByIdWhere(auth.user, id) });
  if (!member) return notFound('Member');
  if (!canTransitionMembership(member.status, 'active')) {
    return error('Cannot reactivate from current status.', 409);
  }
  const updated = await db.member.update({
    where: { id },
    data: { status: 'active', archivedAt: null },
  });
  await recordStatusHistory({
    memberId: id,
    oldStatus: member.status,
    newStatus: 'active',
    changedById: auth.user.id,
    reason: 'Member reactivated',
  });
  await emitMembershipEvent({
    type: 'membership.reactivated',
    userId: auth.user.id,
    entityId: id,
    request,
    details: { from: member.status },
  });
  return success(updated, 'Member reactivated.');
}
