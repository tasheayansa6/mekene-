import { notFound, success } from '@/lib/api/response';
import { optionalAuth } from '@/lib/auth/authorize';
import { listActivePollResults } from '@/lib/live/polls';
import { getLiveSessionBySlug } from '@/lib/live/sessions';
import { canPublicView } from '@/lib/live/status';

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const { user } = await optionalAuth(request);
  const session = await getLiveSessionBySlug(slug);
  if (!session || !canPublicView(session, user)) return notFound('Live session');
  if (!session.pollsEnabled) return success([]);

  const polls = await listActivePollResults(session.id);
  return success(polls);
}
