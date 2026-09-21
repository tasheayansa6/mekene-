import { db } from '@/lib/db';
import { error, forbidden, notFound, success, validationError } from '@/lib/api/response';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { formatZodErrors } from '@/lib/auth/validation';
import {
  canArchiveMembers,
  canUpdateMembers,
  memberByIdWhere,
} from '@/lib/members/access';
import { canTransitionMembership } from '@/lib/members/status';
import { adminMemberPatchSchema } from '@/lib/members/validation';
import { memberAdminInclude, serializeMemberAdmin } from '@/lib/members/serialize';
import { recordStatusHistory } from '@/lib/members/write';
import { emitMembershipEvent } from '@/lib/members/events';
import { readJson } from '@/lib/auth/http';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await guardAdminRead(request, 'members', 'view');
  if (!auth.ok) return auth.error;

  const { id } = await context.params;
  const member = await db.member.findFirst({
    where: memberByIdWhere(auth.user, id),
    include: memberAdminInclude,
  });
  if (!member) return notFound('Member');

  return success({ member: serializeMemberAdmin(member) });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await guardAdminWrite(request, 'members', 'update');
  if (!auth.ok) return auth.error;
  if (!canUpdateMembers(auth.user)) return forbidden();

  const { id } = await context.params;
  const parsed = adminMemberPatchSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const existing = await db.member.findFirst({ where: memberByIdWhere(auth.user, id) });
  if (!existing) return notFound('Member');

  if (parsed.data.status && parsed.data.status !== existing.status) {
    if (parsed.data.status === 'archived' && !canArchiveMembers(auth.user)) {
      return forbidden();
    }
    if (!canTransitionMembership(existing.status, parsed.data.status)) {
      return error('That membership status change is not allowed.', 409);
    }
  }

  if (parsed.data.householdId) {
    const household = await db.household.findUnique({ where: { id: parsed.data.householdId } });
    if (!household) return error('Household not found.', 404);
  }

  const updated = await db.member.update({
    where: { id: existing.id },
    data: {
      displayName: parsed.data.displayName === undefined ? undefined : parsed.data.displayName,
      preferredLanguage: parsed.data.preferredLanguage,
      status: parsed.data.status,
      householdId: parsed.data.householdId === undefined ? undefined : parsed.data.householdId,
      directoryVisibility: parsed.data.directoryVisibility,
      showProfilePhoto: parsed.data.showProfilePhoto,
      showDisplayName: parsed.data.showDisplayName,
      showMinistry: parsed.data.showMinistry,
    },
    include: memberAdminInclude,
  });

  if (parsed.data.status && parsed.data.status !== existing.status) {
    await recordStatusHistory({
      memberId: existing.id,
      oldStatus: existing.status,
      newStatus: parsed.data.status,
      changedById: auth.user.id,
      reason: parsed.data.reason || null,
    });
    await emitMembershipEvent({
      type: parsed.data.status === 'archived' ? 'membership.member_archived' : 'membership.status_changed',
      userId: auth.user.id,
      entityId: existing.id,
      request,
      details: { from: existing.status, to: parsed.data.status },
    });
  } else if (parsed.data.householdId !== undefined && parsed.data.householdId !== existing.householdId) {
    await emitMembershipEvent({
      type: 'membership.household_changed',
      userId: auth.user.id,
      entityId: existing.id,
      request,
      details: { householdId: parsed.data.householdId },
    });
  } else {
    await emitMembershipEvent({
      type: 'membership.member_updated',
      userId: auth.user.id,
      entityId: existing.id,
      request,
      details: { fields: Object.keys(parsed.data) },
    });
  }

  return success({ member: serializeMemberAdmin(updated) }, 'Member updated.');
}
