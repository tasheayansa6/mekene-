import { error, notFound, success, validationError } from '@/lib/api/response';
import { optionalAuth } from '@/lib/auth/authorize';
import { readJson, rejectIfCsrfInvalid } from '@/lib/auth/http';
import { getClientIp } from '@/lib/auth/audit';
import { rateLimitKey } from '@/lib/auth/rate-limit';
import { submitLivePrayer } from '@/lib/live/prayer';
import { getLiveSessionBySlug } from '@/lib/live/sessions';
import { canPublicView } from '@/lib/live/status';
import { livePrayerSubmitSchema, formatZodErrors } from '@/lib/live/validation';

type RouteContext = { params: Promise<{ slug: string }> };

export async function POST(request: Request, context: RouteContext) {
  const csrfError = rejectIfCsrfInvalid(request);
  if (csrfError) return csrfError;

  const ip = getClientIp(request);
  const limited = rateLimitKey(`live:prayer:${ip}`, 10, 60_000);
  if (!limited.allowed) {
    return error('Please wait before submitting another prayer request.', 429);
  }

  const { slug } = await context.params;
  const { user } = await optionalAuth(request);
  const session = await getLiveSessionBySlug(slug);
  if (!session || !canPublicView(session, user)) return notFound('Live session');

  const parsed = livePrayerSubmitSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const result = await submitLivePrayer({
    sessionId: session.id,
    body: parsed.data.body,
    isPrivate: parsed.data.isPrivate,
    name: parsed.data.name,
    submitter: user,
  });

  if (!result.ok) return error(result.error, result.status || 400);

  return success(
    {
      id: result.prayer.id,
      isPrivate: result.prayer.isPrivate,
      createdAt: result.prayer.createdAt.toISOString(),
    },
    'Prayer request submitted.',
    201
  );
}
