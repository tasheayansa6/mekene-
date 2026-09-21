import { db } from '@/lib/db';
import { generateMemberCardToken, hashMemberCardToken } from './family-number';
import { emitMembershipEvent } from './events';

export async function issueMemberCard(input: {
  memberId: string;
  issuedById?: string | null;
  expiresAt?: Date | null;
  request?: Request;
}) {
  const member = await db.member.findUnique({
    where: { id: input.memberId },
    include: { user: { select: { firstName: true, lastName: true, profileImage: true } } },
  });
  if (!member) throw new Error('Member not found');

  await db.memberCard.updateMany({
    where: { memberId: input.memberId, status: 'active' },
    data: { status: 'revoked', revokedAt: new Date() },
  });

  const { token, tokenHash } = generateMemberCardToken();
  const card = await db.memberCard.create({
    data: {
      memberId: input.memberId,
      tokenHash,
      status: 'active',
      expiresAt: input.expiresAt || null,
      issuedById: input.issuedById || null,
    },
  });

  await emitMembershipEvent({
    type: 'membership.member_card_created',
    userId: input.issuedById,
    entityId: card.id,
    request: input.request,
    details: { memberId: input.memberId },
  });

  return {
    card,
    token,
    display: {
      membershipNumber: member.membershipNumber,
      name:
        member.displayName ||
        member.preferredName ||
        `${member.user.firstName} ${member.user.lastName}`.trim(),
      status: member.status,
      profileImage: member.showProfilePhoto ? member.user.profileImage : null,
    },
  };
}

/** Verify card token — returns minimal public verification payload only. */
export async function verifyMemberCard(token: string) {
  const tokenHash = hashMemberCardToken(token);
  const card = await db.memberCard.findUnique({
    where: { tokenHash },
    include: {
      member: {
        select: {
          id: true,
          membershipNumber: true,
          status: true,
          displayName: true,
          preferredName: true,
          showProfilePhoto: true,
          user: { select: { firstName: true, lastName: true, profileImage: true } },
        },
      },
    },
  });
  if (!card) return { ok: false as const, reason: 'not_found' as const };
  if (card.status !== 'active') return { ok: false as const, reason: 'revoked' as const };
  if (card.expiresAt && card.expiresAt < new Date()) {
    return { ok: false as const, reason: 'expired' as const };
  }
  if (['archived', 'deceased', 'suspended'].includes(card.member.status)) {
    return { ok: false as const, reason: 'inactive_member' as const };
  }

  const name =
    card.member.displayName ||
    card.member.preferredName ||
    `${card.member.user.firstName} ${card.member.user.lastName}`.trim();

  return {
    ok: true as const,
    member: {
      membershipNumber: card.member.membershipNumber,
      name,
      status: card.member.status,
      profileImage: card.member.showProfilePhoto ? card.member.user.profileImage : null,
    },
  };
}
