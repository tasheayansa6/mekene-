import { error, notFound, success, tooManyRequests, validationError } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';
import { readJson, rejectIfCsrfInvalid } from '@/lib/auth/http';
import { getClientIp } from '@/lib/auth/audit';
import { rateLimitKey } from '@/lib/auth/rate-limit';
import { listRecentChatMessages, postLiveChatMessage } from '@/lib/live/chat';
import { getLiveSessionBySlug } from '@/lib/live/sessions';
import { canPublicView } from '@/lib/live/status';
import { liveChatPostSchema, formatZodErrors } from '@/lib/live/validation';

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const session = await getLiveSessionBySlug(slug);
  if (!session || !canPublicView(session, null)) return notFound('Live session');

  const messages = await listRecentChatMessages(session.id);
  return success(messages.reverse());
}

export async function POST(request: Request, context: RouteContext) {
  const csrfError = rejectIfCsrfInvalid(request);
  if (csrfError) return csrfError;

  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const ip = getClientIp(request);
  const limited = rateLimitKey(`live:chat-post:${ip}`, 60, 60_000);
  if (!limited.allowed) {
    return tooManyRequests('Too many chat messages. Please wait.', limited.retryAfterSeconds);
  }

  const { slug } = await context.params;
  const session = await getLiveSessionBySlug(slug);
  if (!session || !canPublicView(session, auth.user)) return notFound('Live session');

  const parsed = liveChatPostSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const result = await postLiveChatMessage({
    sessionId: session.id,
    user: auth.user,
    body: parsed.data.body,
  });

  if (!result.ok) {
    if (result.status === 429) {
      return tooManyRequests(result.error, result.retryAfterSeconds);
    }
    return error(result.error, result.status || 400);
  }

  return success(result.message, 'Message posted.', 201);
}
