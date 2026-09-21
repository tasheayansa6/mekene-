import { db } from '@/lib/db';
import { error, success, tooManyRequests } from '@/lib/api/response';
import { rejectIfCsrfInvalid } from '@/lib/auth/http';
import { getClientIp } from '@/lib/auth/audit';
import { rateLimitKey } from '@/lib/auth/rate-limit';
import { getSessionUser } from '@/lib/auth/session';
import { isPubliclyListable } from '@/lib/prayer/status';
import {
  attachPrayerActorCookie,
  getOrCreateActorToken,
  prayerActorHash,
} from '@/lib/prayer/actor';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const csrfError = rejectIfCsrfInvalid(request);
  if (csrfError) return csrfError;

  const ip = getClientIp(request);
  const limited = rateLimitKey(`prayer:pray:${ip}`, 30, 60 * 60 * 1000);
  if (!limited.allowed) {
    return tooManyRequests('Please wait before marking another prayer.', limited.retryAfterSeconds);
  }

  const { id } = await context.params;
  const row = await db.prayerRequest.findUnique({ where: { id } });
  if (!row || !isPubliclyListable(row)) {
    return error('This prayer request is not available.', 404);
  }

  const user = await getSessionUser(request);
  const actor = getOrCreateActorToken(request);
  const actorToken = user?.id || actor.token;
  const actorHash = prayerActorHash(id, actorToken);

  try {
    await db.prayerInteraction.create({
      data: {
        requestId: id,
        actorHash,
        userId: user?.id ?? null,
      },
    });
  } catch {
    const response = success({ prayedCount: row.prayedCount, alreadyPrayed: true });
    if (!user && actor.created) attachPrayerActorCookie(response, actor.token);
    return response;
  }

  const updated = await db.prayerRequest.update({
    where: { id },
    data: { prayedCount: { increment: 1 } },
    select: { prayedCount: true },
  });

  const response = success({ prayedCount: updated.prayedCount, alreadyPrayed: false });
  if (!user) attachPrayerActorCookie(response, actor.token);
  return response;
}
