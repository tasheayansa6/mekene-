import { db } from '@/lib/db';
import { paginated } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const url = new URL(request.url);
  const unreadOnly = url.searchParams.get('unread') === '1';
  const page = Math.max(1, Number(url.searchParams.get('page') || 1));
  const pageSize = Math.min(50, Math.max(1, Number(url.searchParams.get('pageSize') || 20)));
  const now = new Date();

  const where = {
    userId: auth.user.id,
    AND: [
      { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      ...(unreadOnly ? [{ readAt: null }] : []),
    ],
  };

  const [totalItems, unreadCount, rows] = await Promise.all([
    db.appNotification.count({ where }),
    db.appNotification.count({
      where: {
        userId: auth.user.id,
        readAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    }),
    db.appNotification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return paginated(
    rows.map((row) => ({
      id: row.id,
      type: row.type,
      title: row.title,
      message: row.message,
      relatedUrl: row.relatedUrl,
      readAt: row.readAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    })),
    { page, pageSize, totalItems },
    { unreadCount }
  );
}
