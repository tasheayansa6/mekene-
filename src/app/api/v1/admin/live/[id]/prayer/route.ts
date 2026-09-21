import { error, notFound, success, validationError } from '@/lib/api/response';
import { readJson } from '@/lib/auth/http';
import { enforceAdminRateLimit } from '@/lib/admin/guard';
import { guardLiveAdminRead, guardLiveAdminWrite } from '@/lib/live/guard';
import { canManageLivePrayer } from '@/lib/live/access';
import { listAdminLivePrayers, updateLivePrayerStatus } from '@/lib/live/prayer';
import { getLiveSessionById } from '@/lib/live/sessions';
import { livePrayerPatchSchema, formatZodErrors } from '@/lib/live/validation';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const auth = await guardLiveAdminRead(request);
  if (!auth.ok) return auth.error;
  if (!canManageLivePrayer(auth.user)) {
    return error('You do not have permission to view live prayer requests.', 403);
  }
  const limited = enforceAdminRateLimit(request, auth.user.id, 'live-prayer-list');
  if (limited) return limited;

  const { id } = await context.params;
  const session = await getLiveSessionById(id);
  if (!session) return notFound('Live session');

  const prayers = await listAdminLivePrayers(id);
  return success(prayers);
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await guardLiveAdminWrite(request, 'moderate');
  if (!auth.ok) return auth.error;
  if (!canManageLivePrayer(auth.user)) {
    return error('You do not have permission to manage live prayer requests.', 403);
  }
  const limited = enforceAdminRateLimit(request, auth.user.id, 'live-prayer-update');
  if (limited) return limited;

  const { id } = await context.params;
  const session = await getLiveSessionById(id);
  if (!session) return notFound('Live session');

  const parsed = livePrayerPatchSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const result = await updateLivePrayerStatus({
    sessionId: id,
    prayerId: parsed.data.prayerId,
    status: parsed.data.status,
  });
  if (!result.ok) return error(result.error, 404);
  return success(result.prayer);
}
