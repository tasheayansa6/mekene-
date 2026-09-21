import { db } from '@/lib/db';
import { notFound, success } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';
import { canAccessAdminPortal } from '@/lib/auth/permissions';
import { rejectIfCsrfInvalid } from '@/lib/auth/http';
import { memberAnnouncementWhere, markAnnouncementRead } from '@/lib/member-portal/announcements';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const csrf = rejectIfCsrfInvalid(request);
  if (csrf) return csrf;

  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const { id } = await context.params;
  const member = await db.member.findUnique({
    where: { userId: auth.user.id },
    include: { ministries: { where: { status: 'active' }, select: { ministryId: true } } },
  });

  const visible = await db.announcement.findFirst({
    where: {
      id,
      AND: [
        memberAnnouncementWhere({
          now: new Date(),
          ministryIds: member?.ministries.map((row) => row.ministryId) || [],
          includeStaff: canAccessAdminPortal(auth.user),
        }),
      ],
    },
    select: { id: true },
  });
  if (!visible) return notFound('Announcement');

  await markAnnouncementRead(auth.user.id, id);
  return success({ read: true });
}
