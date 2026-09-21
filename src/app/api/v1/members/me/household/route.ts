import { db } from '@/lib/db';
import { success } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';

/**
 * Own household memberships only — no other members' private contacts.
 */
export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const member = await db.member.findUnique({
    where: { userId: auth.user.id },
    select: { id: true, householdId: true },
  });

  if (!member) {
    return success({ household: null, memberships: [] });
  }

  const memberships = await db.householdMembership.findMany({
    where: { memberId: member.id },
    include: {
      household: {
        select: {
          id: true,
          name: true,
          primaryMemberId: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  let household: { id: string; name: string; primaryMemberId: string | null } | null = null;
  if (member.householdId) {
    household = await db.household.findUnique({
      where: { id: member.householdId },
      select: { id: true, name: true, primaryMemberId: true },
    });
  } else if (memberships[0]?.household) {
    household = memberships[0].household;
  }

  return success({
    household,
    memberships: memberships.map((row) => ({
      id: row.id,
      householdId: row.householdId,
      relationship: row.relationship,
      isPrimaryContact: row.isPrimaryContact,
      household: row.household,
      createdAt: row.createdAt.toISOString(),
    })),
  });
}
