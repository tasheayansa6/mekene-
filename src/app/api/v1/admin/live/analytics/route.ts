import { success } from '@/lib/api/response';
import { enforceAdminRateLimit } from '@/lib/admin/guard';
import { guardLiveAdminRead } from '@/lib/live/guard';
import { getLiveAnalyticsOverview } from '@/lib/live/analytics';

export async function GET(request: Request) {
  const auth = await guardLiveAdminRead(request);
  if (!auth.ok) return auth.error;
  const limited = enforceAdminRateLimit(request, auth.user.id, 'live-analytics');
  if (limited) return limited;

  const overview = await getLiveAnalyticsOverview();
  return success(overview);
}
