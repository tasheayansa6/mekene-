import { error, success, validationError } from '@/lib/api/response';
import { optionalAuth } from '@/lib/auth/authorize';
import { formatZodErrors } from '@/lib/auth/validation';
import { readJson, rejectIfCsrfInvalid } from '@/lib/auth/http';
import { getClientIp } from '@/lib/auth/audit';
import { rateLimitKey } from '@/lib/auth/rate-limit';
import { tooManyRequests } from '@/lib/api/response';
import { publicGiveSchema } from '@/lib/giving/validation';
import { createPublicContribution, contributionInclude } from '@/lib/giving/write';
import { serializeContributionSelf } from '@/lib/giving/serialize';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  const csrfError = rejectIfCsrfInvalid(request);
  if (csrfError) return csrfError;

  const limited = rateLimitKey(`giving-create:${getClientIp(request)}`, 20, 60_000);
  if (!limited.allowed) {
    return tooManyRequests('Too many contribution attempts.', limited.retryAfterSeconds);
  }

  const auth = await optionalAuth(request);
  const parsed = publicGiveSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  if (!auth.user && !parsed.data.guestEmail && !parsed.data.isAnonymous) {
    return error('Guest email is required unless the gift is anonymous.', 400);
  }

  let memberId: string | null = null;
  if (auth.user) {
    const member = await db.member.findUnique({ where: { userId: auth.user.id } });
    memberId = member?.id || null;
  }

  const result = await createPublicContribution({
    ...parsed.data,
    userId: auth.user?.id || null,
    memberId,
    request,
  });

  if (!result.ok) return error(result.error, 400);

  const full = await db.contribution.findUnique({
    where: { id: result.contribution.id },
    include: contributionInclude,
  });

  return success(
    {
      contribution: full ? serializeContributionSelf(full) : null,
      checkout: result.checkout,
      replay: result.replay,
    },
    result.replay ? 'Contribution already recorded.' : 'Contribution submitted.',
    result.replay ? 200 : 201
  );
}
