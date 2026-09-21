import { db } from '@/lib/db';
import { paginated, success } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';
import { requireActiveMemberForUser } from '@/lib/attendance/write';
import { serializeRecordSelf } from '@/lib/attendance/serialize';

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const member = await requireActiveMemberForUser(auth.user.id);
  if (!member) {
    return success({ records: [], member: null });
  }

  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get('page') || 1));
  const pageSize = Math.min(50, Math.max(1, Number(url.searchParams.get('pageSize') || 20)));

  const where = { memberId: member.id };
  const [totalItems, rows] = await Promise.all([
    db.attendanceRecord.count({ where }),
    db.attendanceRecord.findMany({
      where,
      include: {
        session: {
          select: {
            id: true,
            title: true,
            sessionType: true,
            startsAt: true,
            timezone: true,
          },
        },
      },
      orderBy: { checkInAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return paginated(rows.map(serializeRecordSelf), { page, pageSize, totalItems });
}
