import { notFound, success } from '@/lib/api/response';
import { enforceAdminRateLimit } from '@/lib/admin/guard';
import { guardLiveAdminRead } from '@/lib/live/guard';
import { getLiveSessionReport } from '@/lib/live/analytics';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const auth = await guardLiveAdminRead(request);
  if (!auth.ok) return auth.error;
  const limited = enforceAdminRateLimit(request, auth.user.id, 'live-report');
  if (limited) return limited;

  const { id } = await context.params;
  const report = await getLiveSessionReport(id);
  if (!report) return notFound('Live session');
  return success(report);
}
