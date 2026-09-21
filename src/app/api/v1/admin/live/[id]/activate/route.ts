import { error, notFound, success } from '@/lib/api/response';
import { enforceAdminRateLimit } from '@/lib/admin/guard';
import { guardLiveAdminWrite } from '@/lib/live/guard';
import { activateLiveSession, getLiveSessionById } from '@/lib/live/sessions';
import { serializeAdminLiveSession } from '@/lib/live/serialize';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const auth = await guardLiveAdminWrite(request, 'manage');
  if (!auth.ok) return auth.error;
  const limited = enforceAdminRateLimit(request, auth.user.id, 'live-activate');
  if (limited) return limited;

  const { id } = await context.params;
  const existing = await getLiveSessionById(id);
  if (!existing) return notFound('Live session');

  const result = await activateLiveSession(id, auth.user.id, request);
  if (!result.ok) return error(result.error, 400);
  return success(serializeAdminLiveSession(result.session), 'Live session is now live.');
}
