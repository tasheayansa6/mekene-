import { db } from '@/lib/db';
import { error, forbidden, success, validationError } from '@/lib/api/response';
import { guardAdminWrite } from '@/lib/admin/guard';
import { canArchiveMembers, canUpdateMembers, memberListWhere } from '@/lib/members/access';
import { canTransitionMembership } from '@/lib/members/status';
import { membersBulkSchema } from '@/lib/members/validation';
import { formatZodErrors } from '@/lib/auth/validation';
import { recordStatusHistory } from '@/lib/members/write';
import { emitMembershipEvent } from '@/lib/members/events';
import { readJson } from '@/lib/auth/http';

export async function POST(request: Request) {
  const auth = await guardAdminWrite(request, 'members', 'update');
  if (!auth.ok) return auth.error;
  if (!canUpdateMembers(auth.user)) return forbidden();

  const parsed = membersBulkSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const nextStatus =
    parsed.data.action === 'archive'
      ? 'archived'
      : parsed.data.action === 'set_inactive'
        ? 'inactive'
        : 'active';

  if (nextStatus === 'archived' && !canArchiveMembers(auth.user)) return forbidden();

  const members = await db.member.findMany({
    where: { id: { in: parsed.data.ids }, ...memberListWhere(auth.user) },
  });
  if (members.length !== parsed.data.ids.length) {
    return error('One or more members could not be updated.', 404);
  }

  let updated = 0;
  for (const member of members) {
    if (!canTransitionMembership(member.status, nextStatus)) continue;
    await db.member.update({
      where: { id: member.id },
      data: { status: nextStatus },
    });
    await recordStatusHistory({
      memberId: member.id,
      oldStatus: member.status,
      newStatus: nextStatus,
      changedById: auth.user.id,
      reason: parsed.data.reason || `Bulk ${parsed.data.action}`,
    });
    await emitMembershipEvent({
      type: nextStatus === 'archived' ? 'membership.member_archived' : 'membership.status_changed',
      userId: auth.user.id,
      entityId: member.id,
      request,
      details: { from: member.status, to: nextStatus, bulk: true },
    });
    updated += 1;
  }

  return success({ updated }, `${updated} member record${updated === 1 ? '' : 's'} updated.`);
}
