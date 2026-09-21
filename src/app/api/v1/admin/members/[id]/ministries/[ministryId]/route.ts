import { db } from '@/lib/db';
import { forbidden, notFound, success } from '@/lib/api/response';
import { guardAdminWrite } from '@/lib/admin/guard';
import { canManageMemberMinistries, memberByIdWhere } from '@/lib/members/access';
import { emitMembershipEvent } from '@/lib/members/events';

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string; ministryId: string }> }
) {
  const auth = await guardAdminWrite(request, 'members', 'update');
  if (!auth.ok) return auth.error;
  if (!canManageMemberMinistries(auth.user)) return forbidden();

  const { id, ministryId } = await context.params;
  const member = await db.member.findFirst({ where: memberByIdWhere(auth.user, id) });
  if (!member) return notFound('Member');

  const existing = await db.memberMinistry.findUnique({
    where: { memberId_ministryId: { memberId: member.id, ministryId } },
  });
  if (!existing) return notFound('Ministry participation');

  await db.memberMinistry.delete({ where: { id: existing.id } });

  await emitMembershipEvent({
    type: 'membership.ministry_changed',
    userId: auth.user.id,
    entityId: member.id,
    request,
    details: { memberId: member.id, ministryId, action: 'removed' },
  });

  return success({ removed: true }, 'Ministry participation removed.');
}
