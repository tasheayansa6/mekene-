import { error, notFound, success, tooManyRequests, validationError } from '@/lib/api/response';
import { optionalAuth } from '@/lib/auth/authorize';
import { readJson, rejectIfCsrfInvalid } from '@/lib/auth/http';
import { addLiveReaction } from '@/lib/live/reactions';
import { getLiveSessionBySlug } from '@/lib/live/sessions';
import { canPublicView } from '@/lib/live/status';
import { attachLiveVisitorCookie, getOrCreateVisitorKey } from '@/lib/live/visitor';
import { liveReactionSchema, formatZodErrors } from '@/lib/live/validation';

type RouteContext = { params: Promise<{ slug: string }> };

export async function POST(request: Request, context: RouteContext) {
  const csrfError = rejectIfCsrfInvalid(request);
  if (csrfError) return csrfError;

  const { slug } = await context.params;
  const { user } = await optionalAuth(request);
  const session = await getLiveSessionBySlug(slug);
  if (!session || !canPublicView(session, user)) return notFound('Live session');

  const parsed = liveReactionSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const visitor = user ? null : getOrCreateVisitorKey(request);
  const result = await addLiveReaction({
    sessionId: session.id,
    emoji: parsed.data.emoji,
    userId: user?.id,
    visitorKey: visitor?.key,
  });

  if (!result.ok) {
    if (result.status === 429) {
      return tooManyRequests(result.error, result.retryAfterSeconds);
    }
    return error(result.error, result.status || 400);
  }

  const response = success({ emoji: result.reaction.emoji });
  if (visitor?.created) attachLiveVisitorCookie(response, visitor.key);
  return response;
}
