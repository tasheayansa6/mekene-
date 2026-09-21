import { db } from '@/lib/db';
import { success } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const now = new Date();
  const rows = await db.eventRegistration.findMany({
    where: {
      userId: auth.user.id,
      status: { in: ['registered', 'waitlisted', 'confirmed'] },
      event: { endAt: { gte: now }, status: { notIn: ['archived'] } },
    },
    include: {
      event: {
        select: {
          id: true,
          title: true,
          slug: true,
          startAt: true,
          endAt: true,
          timezone: true,
          status: true,
        },
      },
    },
    orderBy: { event: { startAt: 'asc' } },
    take: 50,
  });

  return success({
    upcoming: rows.map((row) => ({
      id: row.id,
      reference: row.reference,
      status: row.status,
      event: {
        ...row.event,
        startAt: row.event.startAt.toISOString(),
        endAt: row.event.endAt.toISOString(),
      },
    })),
  });
}
