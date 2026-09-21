import { db } from '@/lib/db';
import { forbidden, success } from '@/lib/api/response';
import { guardAdminRead } from '@/lib/admin/guard';
import { canModerateMessages } from '@/lib/communications/access';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'communications', 'view');
  if (!auth.ok) return auth.error;
  if (!canModerateMessages(auth.user)) return forbidden();

  const url = new URL(request.url);
  const status = url.searchParams.get('status') || 'open';
  const page = Math.max(1, Number(url.searchParams.get('page') || 1));
  const pageSize = Math.min(50, Math.max(1, Number(url.searchParams.get('pageSize') || 20)));

  const where = {
    status: status as 'open' | 'reviewed' | 'dismissed' | 'actioned',
  };

  const [totalItems, rows] = await Promise.all([
    db.messageReport.count({ where }),
    db.messageReport.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        message: {
          select: {
            id: true,
            body: true,
            createdAt: true,
            conversationId: true,
          },
        },
        reporter: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    }),
  ]);

  return success({
    page,
    pageSize,
    totalItems,
    reports: rows.map((row) => ({
      id: row.id,
      reason: row.reason,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      reviewedAt: row.reviewedAt?.toISOString() ?? null,
      message: {
        id: row.message.id,
        body: row.message.body.slice(0, 500),
        conversationId: row.message.conversationId,
        createdAt: row.message.createdAt.toISOString(),
      },
      reporter: {
        id: row.reporter.id,
        firstName: row.reporter.firstName,
        lastName: row.reporter.lastName,
      },
    })),
  });
}
