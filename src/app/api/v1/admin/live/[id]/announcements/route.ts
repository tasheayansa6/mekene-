import { error, notFound, success, validationError } from '@/lib/api/response';
import { readJson } from '@/lib/auth/http';
import { enforceAdminRateLimit } from '@/lib/admin/guard';
import { guardLiveAdminWrite } from '@/lib/live/guard';
import { createLiveAnnouncement } from '@/lib/live/announcements';
import { getLiveSessionById } from '@/lib/live/sessions';
import { liveAnnouncementSchema, formatZodErrors } from '@/lib/live/validation';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const auth = await guardLiveAdminWrite(request, 'manage');
  if (!auth.ok) return auth.error;
  const limited = enforceAdminRateLimit(request, auth.user.id, 'live-announcement');
  if (limited) return limited;

  const { id } = await context.params;
  const session = await getLiveSessionById(id);
  if (!session) return notFound('Live session');

  const parsed = liveAnnouncementSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  let expiresAt: Date | null = null;
  if (parsed.data.expiresAt) {
    const date = new Date(parsed.data.expiresAt);
    if (!Number.isNaN(date.getTime())) expiresAt = date;
  }

  const result = await createLiveAnnouncement({
    sessionId: id,
    body: parsed.data.body,
    isPinned: parsed.data.isPinned,
    expiresAt,
    authorId: auth.user.id,
  });
  if (!result.ok) return error(result.error, 400);
  return success(result.announcement, 'Announcement posted.', 201);
}
