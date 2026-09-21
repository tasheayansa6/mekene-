import { db } from '@/lib/db';
import { notFound, success } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';

/** Family dashboard for the authenticated member — no other families, no giving. */
export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;
  const member = await db.member.findUnique({
    where: { userId: auth.user.id },
    include: {
      household: {
        include: {
          members: {
            select: {
              id: true,
              displayName: true,
              preferredName: true,
              membershipNumber: true,
              status: true,
              user: { select: { firstName: true, lastName: true, profileImage: true } },
            },
          },
          memberships: true,
        },
      },
      householdMemberships: true,
    },
  });
  if (!member) return notFound('Membership');
  if (!member.household) {
    return success({ household: null, members: [] });
  }

  const relationshipByMember = new Map(
    member.household.memberships.map((m) => [m.memberId, m])
  );

  return success({
    household: {
      id: member.household.id,
      familyReference: member.household.familyReference,
      name: member.household.name,
      addressNote: member.household.addressNote,
      status: member.household.status,
    },
    members: member.household.members.map((m) => {
      const link = relationshipByMember.get(m.id);
      return {
        id: m.id,
        name: m.displayName || m.preferredName || `${m.user.firstName} ${m.user.lastName}`.trim(),
        membershipNumber: m.membershipNumber,
        status: m.status,
        relationship: link?.relationship || 'household',
        isPrimaryContact: Boolean(link?.isPrimaryContact),
        isSelf: m.id === member.id,
      };
    }),
  });
}
