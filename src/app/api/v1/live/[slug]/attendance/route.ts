import { error, notFound, success, tooManyRequests } from '@/lib/api/response';
import { optionalAuth } from '@/lib/auth/authorize';
import { rejectIfCsrfInvalid, withCsrfCookie } from '@/lib/auth/http';
import { checkInLiveAttendance } from '@/lib/live/attendance';
import { getLiveSessionBySlug } from '@/lib/live/sessions';
import { canPublicView } from '@/lib/live/status';
import { attachLiveVisitorCookie, getOrCreateVisitorKey } from '@/lib/live/visitor';

type RouteContext = { params: Promise<{ slug: string }> };

export async function POST(request: Request, context: RouteContext) {
  const csrfError = rejectIfCsrfInvalid(request);
  if (csrfError) return csrfError;

  const { slug } = await context.params;
  const { user } = await optionalAuth(request);
  const session = await getLiveSessionBySlug(slug);
  if (!session || !canPublicView(session, user)) return notFound('Live session');

  const visitor = user ? null : getOrCreateVisitorKey(request);
  const result = await checkInLiveAttendance({
    sessionId: session.id,
    userId: user?.id,
    visitorKey: visitor?.key,
  });

  if (!result.ok) {
    if (result.status === 429) {
      return tooManyRequests(result.error, result.retryAfterSeconds);
    }
    return error(result.error, result.status || 400);
  }

  const response = success({
    checkedInAt: result.attendance?.checkedInAt.toISOString(),
    alreadyCheckedIn: result.alreadyCheckedIn,
  });

  if (visitor?.created) {
    attachLiveVisitorCookie(withCsrfCookie(response), visitor.key);
    return response;
  }

  return response;
}
