import { notFound, success, tooManyRequests } from '@/lib/api/response';
import { getClientIp } from '@/lib/auth/audit';
import { rateLimitKey } from '@/lib/auth/rate-limit';
import { incrementSermonPlayCount } from '@/lib/library/analytics';

type RouteContext = { params: Promise<{ slug: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { slug } = await context.params;

  const limited = rateLimitKey(
    `library-play:${slug}:${getClientIp(request)}`,
    10,
    60 * 1000
  );
  if (!limited.allowed) {
    return tooManyRequests('Please wait before recording another play.', limited.retryAfterSeconds);
  }

  const result = await incrementSermonPlayCount(slug);
  if (!result) return notFound('Sermon');
  return success(result);
}
