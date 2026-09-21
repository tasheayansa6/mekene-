import { error, notFound, success, validationError } from '@/lib/api/response';
import { optionalAuth } from '@/lib/auth/authorize';
import { readJson, rejectIfCsrfInvalid } from '@/lib/auth/http';
import { getClientIp } from '@/lib/auth/audit';
import { rateLimitKey } from '@/lib/auth/rate-limit';
import { bumpApproximateViewers, touchPresence } from '@/lib/live/presence';
import { getLiveSessionBySlug } from '@/lib/live/sessions';
import { canPublicView } from '@/lib/live/status';
import { livePresenceSchema, formatZodErrors } from '@/lib/live/validation';

type RouteContext = { params: Promise<{ slug: string }> };

export async function POST(request: Request, context: RouteContext) {
  const csrfError = rejectIfCsrfInvalid(request);
  if (csrfError) return csrfError;

  const ip = getClientIp(request);
  const limited = rateLimitKey(`live:presence:${ip}`, 120, 60_000);
  if (!limited.allowed) {
    return error('Too many presence updates.', 429);
  }

  const { slug } = await context.params;
  const { user } = await optionalAuth(request);
  const session = await getLiveSessionBySlug(slug);
  if (!session || !canPublicView(session, user)) return notFound('Live session');

  const parsed = livePresenceSchema.safeParse(await readJson(request).catch(() => ({})));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const updated =
    parsed.data.approximateViewers !== undefined
      ? await touchPresence(session.id, parsed.data.approximateViewers)
      : await bumpApproximateViewers(session.id);

  if (!updated) return error('Presence updates are only available during live sessions.', 403);

  return success(updated);
}
