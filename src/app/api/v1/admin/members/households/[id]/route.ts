import { db } from '@/lib/db';
import { forbidden, notFound, success, validationError } from '@/lib/api/response';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { canManageHouseholds, canViewMembers } from '@/lib/members/access';
import { householdSchema } from '@/lib/members/validation';
import { formatZodErrors } from '@/lib/auth/validation';
import { emitMembershipEvent } from '@/lib/members/events';
import { readJson } from '@/lib/auth/http';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await guardAdminRead(request, 'members', 'view');
  if (!auth.ok) return auth.error;
  if (!canViewMembers(auth.user)) return forbidden();

  const { id } = await context.params;
  const household = await db.household.findUnique({
    where: { id },
    include: {
      members: {
        include: { user: { select: { firstName: true, lastName: true } } },
      },
    },
  });
  if (!household) return notFound('Household');

  return success({
    household: {
      id: household.id,
      name: household.name,
      primaryMemberId: household.primaryMemberId,
      addressNote: household.addressNote,
      members: household.members.map((member) => ({
        id: member.id,
        membershipNumber: member.membershipNumber,
        name: member.displayName || `${member.user.firstName} ${member.user.lastName}`.trim(),
      })),
    },
  });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await guardAdminWrite(request, 'members', 'manage');
  if (!auth.ok) return auth.error;
  if (!canManageHouseholds(auth.user)) return forbidden();

  const parsed = householdSchema.partial().safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const { id } = await context.params;
  const existing = await db.household.findUnique({ where: { id } });
  if (!existing) return notFound('Household');

  const updated = await db.household.update({
    where: { id },
    data: {
      name: parsed.data.name,
      primaryMemberId:
        parsed.data.primaryMemberId === undefined ? undefined : parsed.data.primaryMemberId,
      addressNote: parsed.data.addressNote === undefined ? undefined : parsed.data.addressNote || null,
    },
  });

  await emitMembershipEvent({
    type: 'membership.household_changed',
    userId: auth.user.id,
    entityId: id,
    request,
    details: { householdId: id, action: 'updated' },
  });

  return success({ household: updated }, 'Household updated.');
}
