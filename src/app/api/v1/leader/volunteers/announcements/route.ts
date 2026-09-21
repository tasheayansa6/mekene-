import { db } from '@/lib/db';
import { forbidden, success, validationError } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';
import { readJson, rejectIfCsrfInvalid } from '@/lib/auth/http';
import { sendNotification } from '@/lib/communications/service';
import { canManageTeam } from '@/lib/volunteers/access';
import { VOLUNTEER_GENERIC_NOTIFY_MESSAGE } from '@/lib/volunteers/events';
import { formatZodErrors, teamAnnouncementSchema } from '@/lib/volunteers/validation';
import { teamInclude } from '@/lib/volunteers/serialize';

export async function POST(request: Request) {
  const csrfError = rejectIfCsrfInvalid(request);
  if (csrfError) return csrfError;
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const parsed = teamAnnouncementSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const team = await db.ministryTeam.findUnique({
    where: { id: parsed.data.teamId },
    include: { ...teamInclude, members: { where: { status: 'active' }, select: { member: { select: { userId: true } } } } },
  });
  if (!team) return forbidden();
  if (!canManageTeam(auth.user, team)) return forbidden();

  const userIds = [...new Set(team.members.map((row) => row.member.userId).filter(Boolean))];
  for (const userId of userIds) {
    await sendNotification({
      userId,
      type: 'ministry_update',
      title: parsed.data.title,
      message: parsed.data.message || VOLUNTEER_GENERIC_NOTIFY_MESSAGE,
      relatedUrl: '/member/volunteering',
      transactional: true,
      channels: ['in_app'],
      createdById: auth.user.id,
    });
  }

  return success({ sent: userIds.length }, 'Announcement sent.');
}
