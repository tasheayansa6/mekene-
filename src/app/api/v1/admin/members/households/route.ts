import { db } from '@/lib/db';
import { forbidden, notFound, success, validationError } from '@/lib/api/response';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { canManageHouseholds, canViewMembers } from '@/lib/members/access';
import { householdSchema } from '@/lib/members/validation';
import { formatZodErrors } from '@/lib/auth/validation';
import { emitMembershipEvent } from '@/lib/members/events';
import { readJson } from '@/lib/auth/http';
import { nextFamilyReference } from '@/lib/members/family-number';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'members', 'view');
  if (!auth.ok) return auth.error;
  if (!canViewMembers(auth.user)) return forbidden();

  const rows = await db.household.findMany({
    include: {
      members: {
        select: {
          id: true,
          displayName: true,
          membershipNumber: true,
          user: { select: { firstName: true, lastName: true } },
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  return success({
    households: rows.map((row) => ({
      id: row.id,
      familyReference: row.familyReference,
      name: row.name,
      status: row.status,
      primaryMemberId: row.primaryMemberId,
      addressNote: row.addressNote,
      memberCount: row.members.length,
      members: row.members.map((member) => ({
        id: member.id,
        membershipNumber: member.membershipNumber,
        name: member.displayName || `${member.user.firstName} ${member.user.lastName}`.trim(),
      })),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    })),
  });
}

export async function POST(request: Request) {
  const auth = await guardAdminWrite(request, 'members', 'manage');
  if (!auth.ok) return auth.error;
  if (!canManageHouseholds(auth.user)) return forbidden();

  const parsed = householdSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  if (parsed.data.primaryMemberId) {
    const member = await db.member.findUnique({ where: { id: parsed.data.primaryMemberId } });
    if (!member) return notFound('Member');
  }

  const created = await db.household.create({
    data: {
      name: parsed.data.name,
      familyReference: await nextFamilyReference(),
      primaryMemberId: parsed.data.primaryMemberId || null,
      addressNote: parsed.data.addressNote || null,
      status: 'active',
    },
  });

  if (parsed.data.primaryMemberId) {
    await db.member.update({
      where: { id: parsed.data.primaryMemberId },
      data: { householdId: created.id },
    });
  }

  await emitMembershipEvent({
    type: 'membership.household_changed',
    userId: auth.user.id,
    entityId: created.id,
    request,
    details: { householdId: created.id, action: 'created' },
  });

  return success({ household: created }, 'Household created.', 201);
}
