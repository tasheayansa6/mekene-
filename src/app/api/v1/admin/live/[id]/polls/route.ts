import { error, notFound, success, validationError } from '@/lib/api/response';
import { readJson } from '@/lib/auth/http';
import { enforceAdminRateLimit } from '@/lib/admin/guard';
import { guardLiveAdminRead, guardLiveAdminWrite } from '@/lib/live/guard';
import {
  activateLivePoll,
  closeLivePoll,
  createLivePoll,
  listLivePolls,
  aggregatePollResults,
} from '@/lib/live/polls';
import { getLiveSessionById } from '@/lib/live/sessions';
import { livePollCreateSchema, formatZodErrors } from '@/lib/live/validation';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const auth = await guardLiveAdminRead(request);
  if (!auth.ok) return auth.error;
  const limited = enforceAdminRateLimit(request, auth.user.id, 'live-polls-list');
  if (limited) return limited;

  const { id } = await context.params;
  const session = await getLiveSessionById(id);
  if (!session) return notFound('Live session');

  const polls = await listLivePolls(id);
  const withResults = await Promise.all(
    polls.map(async (poll) => ({
      ...poll,
      results: await aggregatePollResults(id, poll.id),
    }))
  );
  return success(withResults);
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await guardLiveAdminWrite(request, 'manage');
  if (!auth.ok) return auth.error;
  const limited = enforceAdminRateLimit(request, auth.user.id, 'live-polls-create');
  if (limited) return limited;

  const { id } = await context.params;
  const session = await getLiveSessionById(id);
  if (!session) return notFound('Live session');

  const body = await readJson(request);
  const action =
    typeof body === 'object' && body && 'action' in body ? String(body.action) : 'create';

  if (action === 'activate' && typeof body === 'object' && body && 'pollId' in body) {
    const result = await activateLivePoll(id, String(body.pollId));
    if (!result.ok) return error(result.error, 400);
    return success(result.poll);
  }

  if (action === 'close' && typeof body === 'object' && body && 'pollId' in body) {
    const result = await closeLivePoll(id, String(body.pollId));
    if (!result.ok) return error(result.error, 400);
    return success(result.poll);
  }

  const parsed = livePollCreateSchema.safeParse(body);
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const result = await createLivePoll({
    sessionId: id,
    question: parsed.data.question,
    options: parsed.data.options,
  });
  if (!result.ok) return error(result.error, 400);
  return success(result.poll, 'Poll created.', 201);
}
