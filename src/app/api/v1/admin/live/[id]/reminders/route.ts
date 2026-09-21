import { error, notFound, success, validationError } from '@/lib/api/response';
import { readJson } from '@/lib/auth/http';
import { enforceAdminRateLimit } from '@/lib/admin/guard';
import { guardLiveAdminWrite } from '@/lib/live/guard';
import { scheduleLiveReminders } from '@/lib/live/reminders';
import { getLiveSessionById } from '@/lib/live/sessions';
import { liveRemindersSchema, formatZodErrors } from '@/lib/live/validation';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const auth = await guardLiveAdminWrite(request, 'manage');
  if (!auth.ok) return auth.error;
  const limited = enforceAdminRateLimit(request, auth.user.id, 'live-reminders');
  if (limited) return limited;

  const { id } = await context.params;
  const session = await getLiveSessionById(id);
  if (!session) return notFound('Live session');

  const parsed = liveRemindersSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const jobs = await scheduleLiveReminders({
    session,
    reminderOffsetsMinutes: parsed.data.reminderOffsetsMinutes,
    createdById: auth.user.id,
  });

  return success(
    { scheduled: jobs.length, jobs: jobs.map((job) => ({ id: job.id, scheduledAt: job.scheduledAt?.toISOString() ?? null })) },
    'Live reminders scheduled.'
  );
}
