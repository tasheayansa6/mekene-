import { db } from '@/lib/db';
import { paginated, success } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get('page') || 1));
  const pageSize = Math.min(50, Math.max(1, Number(url.searchParams.get('pageSize') || 20)));
  const status = url.searchParams.get('status') || undefined;

  const where = {
    userId: auth.user.id,
    ...(status
      ? {
          status: status as
            | 'registered'
            | 'waitlisted'
            | 'confirmed'
            | 'cancelled'
            | 'attended'
            | 'no_show',
        }
      : {}),
  };

  const [totalItems, rows] = await Promise.all([
    db.eventRegistration.count({ where }),
    db.eventRegistration.findMany({
      where,
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
            location: { select: { name: true } },
          },
        },
      },
      orderBy: { registeredAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return paginated(
    rows.map((row) => ({
      id: row.id,
      reference: row.reference,
      status: row.status,
      registeredAt: row.registeredAt.toISOString(),
      cancelledAt: row.cancelledAt?.toISOString() ?? null,
      waitlistPosition: row.waitlistPosition,
      event: {
        ...row.event,
        startAt: row.event.startAt.toISOString(),
        endAt: row.event.endAt.toISOString(),
        locationName: row.event.location?.name ?? null,
      },
    })),
    { page, pageSize, totalItems }
  );
}
