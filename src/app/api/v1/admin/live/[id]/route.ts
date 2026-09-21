import { error, notFound, success, validationError } from '@/lib/api/response';
import { readJson } from '@/lib/auth/http';
import { enforceAdminRateLimit } from '@/lib/admin/guard';
import { guardLiveAdminRead, guardLiveAdminWrite } from '@/lib/live/guard';
import { getLiveSessionById, updateLiveSession } from '@/lib/live/sessions';
import { serializeAdminLiveSession } from '@/lib/live/serialize';
import { liveSessionPatchSchema, formatZodErrors } from '@/lib/live/validation';
import { parseEventDateTime } from '@/lib/events/timezone';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const auth = await guardLiveAdminRead(request);
  if (!auth.ok) return auth.error;
  const limited = enforceAdminRateLimit(request, auth.user.id, 'live-detail');
  if (limited) return limited;

  const { id } = await context.params;
  const session = await getLiveSessionById(id);
  if (!session) return notFound('Live session');
  return success(serializeAdminLiveSession(session));
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await guardLiveAdminWrite(request, 'update');
  if (!auth.ok) return auth.error;
  const limited = enforceAdminRateLimit(request, auth.user.id, 'live-update');
  if (limited) return limited;

  const { id } = await context.params;
  const parsed = liveSessionPatchSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const existing = await getLiveSessionById(id);
  if (!existing) return notFound('Live session');

  const timezone = parsed.data.timezone || existing.timezone;
  const result = await updateLiveSession({
    id,
    data: {
      ...parsed.data,
      scheduledStartAt: parsed.data.scheduledStartAt
        ? parseEventDateTime(parsed.data.scheduledStartAt, timezone) || undefined
        : undefined,
      scheduledEndAt:
        parsed.data.scheduledEndAt === undefined
          ? undefined
          : parsed.data.scheduledEndAt
            ? parseEventDateTime(parsed.data.scheduledEndAt, timezone)
            : null,
    },
    userId: auth.user.id,
    request,
  });

  if (!result.ok) return error(result.error, 400);
  return success(serializeAdminLiveSession(result.session), 'Live session updated.');
}
