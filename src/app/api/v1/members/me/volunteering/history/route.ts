import { db } from '@/lib/db';
import { success } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';
import { serializeAssignment } from '@/lib/volunteers/serialize';

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const member = await db.member.findUnique({
    where: { userId: auth.user.id },
    select: { id: true },
  });
  if (!member) return success({ history: [], hoursMinutes: 0 });

  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get('page') || 1));
  const pageSize = Math.min(50, Math.max(1, Number(url.searchParams.get('pageSize') || 20)));

  const [totalItems, rows] = await Promise.all([
    db.serviceAssignment.count({ where: { memberId: member.id } }),
    db.serviceAssignment.findMany({
      where: { memberId: member.id },
      include: {
        event: { select: { id: true, title: true, slug: true, startAt: true, endAt: true } },
        ministry: { select: { id: true, name: true, slug: true } },
        team: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { scheduledAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const hoursMinutes = await db.serviceAssignment.aggregate({
    where: { memberId: member.id },
    _sum: { hoursMinutes: true },
  });

  return success({
    history: rows.map(serializeAssignment),
    hoursMinutes: hoursMinutes._sum.hoursMinutes ?? 0,
    pagination: { page, pageSize, totalItems },
  });
}
