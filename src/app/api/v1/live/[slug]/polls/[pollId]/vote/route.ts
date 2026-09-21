import { error, notFound, success, validationError } from '@/lib/api/response';
import { optionalAuth } from '@/lib/auth/authorize';
import { readJson, rejectIfCsrfInvalid } from '@/lib/auth/http';
import { voteLivePoll, aggregatePollResults } from '@/lib/live/polls';
import { getLiveSessionBySlug } from '@/lib/live/sessions';
import { canPublicView } from '@/lib/live/status';
import { attachLiveVisitorCookie, getOrCreateVisitorKey } from '@/lib/live/visitor';
import { livePollVoteSchema, formatZodErrors } from '@/lib/live/validation';

type RouteContext = { params: Promise<{ slug: string; pollId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const csrfError = rejectIfCsrfInvalid(request);
  if (csrfError) return csrfError;

  const { slug, pollId } = await context.params;
  const { user } = await optionalAuth(request);
  const session = await getLiveSessionBySlug(slug);
  if (!session || !canPublicView(session, user)) return notFound('Live session');

  const parsed = livePollVoteSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const visitor = user ? null : getOrCreateVisitorKey(request);
  const result = await voteLivePoll({
    sessionId: session.id,
    pollId,
    optionId: parsed.data.optionId,
    userId: user?.id,
    visitorKey: visitor?.key,
  });

  if (!result.ok) return error(result.error, 400);

  const totals = await aggregatePollResults(session.id, pollId);
  const response = success({ alreadyVoted: result.alreadyVoted, results: totals });
  if (visitor?.created) attachLiveVisitorCookie(response, visitor.key);
  return response;
}
