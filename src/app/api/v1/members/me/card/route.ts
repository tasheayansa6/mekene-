import { db } from '@/lib/db';
import { notFound, success } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';
import { issueMemberCard } from '@/lib/members/card';

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;
  const member = await db.member.findUnique({ where: { userId: auth.user.id } });
  if (!member) return notFound('Membership');

  const card = await db.memberCard.findFirst({
    where: { memberId: member.id, status: 'active' },
    orderBy: { issuedAt: 'desc' },
  });

  return success({
    membershipNumber: member.membershipNumber,
    status: member.status,
    hasActiveCard: Boolean(card),
    card: card
      ? {
          id: card.id,
          issuedAt: card.issuedAt.toISOString(),
          expiresAt: card.expiresAt?.toISOString() ?? null,
        }
      : null,
  });
}

export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;
  const member = await db.member.findUnique({ where: { userId: auth.user.id } });
  if (!member) return notFound('Membership');
  if (!['active', 'approved'].includes(member.status)) {
    return notFound('Active membership');
  }

  const issued = await issueMemberCard({
    memberId: member.id,
    issuedById: auth.user.id,
    request,
  });

  return success(
    {
      token: issued.token,
      display: issued.display,
      cardId: issued.card.id,
    },
    'Member card ready.',
    201
  );
}
