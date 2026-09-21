import { db } from '@/lib/db';
import { paginated } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';
import { canAccessAdminPortal } from '@/lib/auth/permissions';
import { listMemberAnnouncements } from '@/lib/member-portal/announcements';

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get('page') || 1));
  const pageSize = Math.min(50, Math.max(1, Number(url.searchParams.get('pageSize') || 20)));

  const member = await db.member.findUnique({
    where: { userId: auth.user.id },
    include: { ministries: { where: { status: 'active' }, select: { ministryId: true } } },
  });

  const result = await listMemberAnnouncements({
    userId: auth.user.id,
    ministryIds: member?.ministries.map((row) => row.ministryId) || [],
    includeStaff: canAccessAdminPortal(auth.user),
    page,
    pageSize,
  });

  return paginated(result.announcements, {
    page: result.page,
    pageSize: result.pageSize,
    totalItems: result.totalItems,
  });
}
