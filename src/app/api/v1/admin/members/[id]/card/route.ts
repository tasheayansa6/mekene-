import { db } from '@/lib/db';
import { forbidden, notFound, success } from '@/lib/api/response';
import { guardAdminWrite } from '@/lib/admin/guard';
import { canIssueMemberCards, memberByIdWhere } from '@/lib/members/access';
import { issueMemberCard } from '@/lib/members/card';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const auth = await guardAdminWrite(request, 'members', 'view');
  if (!auth.ok) return auth.error;
  const { id } = await context.params;
  const member = await db.member.findFirst({ where: memberByIdWhere(auth.user, id) });
  if (!member) return notFound('Member');
  const cards = await db.memberCard.findMany({
    where: { memberId: id },
    orderBy: { issuedAt: 'desc' },
    take: 10,
  });
  return success(
    cards.map((c) => ({
      id: c.id,
      status: c.status,
      issuedAt: c.issuedAt.toISOString(),
      expiresAt: c.expiresAt?.toISOString() ?? null,
      revokedAt: c.revokedAt?.toISOString() ?? null,
    }))
  );
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await guardAdminWrite(request, 'members', 'update');
  if (!auth.ok) return auth.error;
  if (!canIssueMemberCards(auth.user)) return forbidden();
  const { id } = await context.params;
  const member = await db.member.findFirst({ where: memberByIdWhere(auth.user, id) });
  if (!member) return notFound('Member');

  const issued = await issueMemberCard({
    memberId: id,
    issuedById: auth.user.id,
    request,
  });
  return success(
    {
      cardId: issued.card.id,
      token: issued.token,
      display: issued.display,
      note: 'Show this token as a QR payload only to authorized staff. It does not contain personal data.',
    },
    'Member card issued.',
    201
  );
}
