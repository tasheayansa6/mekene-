import { notFound, success } from '@/lib/api/response';
import { optionalAuth } from '@/lib/auth/authorize';
import { getLiveBySlug } from '@/lib/live/public';

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const { user } = await optionalAuth(request);
  const result = await getLiveBySlug(slug, user);
  if (!result) return notFound('Live session');
  return success(result);
}
