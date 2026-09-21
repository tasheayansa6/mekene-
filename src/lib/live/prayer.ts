import { db } from '@/lib/db';
import { sanitizePlainText } from '@/lib/content/sanitize';
import type { LivePrayerStatus } from '@prisma/client';
import type { AuthUser } from '@/lib/auth/permissions';

export async function submitLivePrayer(input: {
  sessionId: string;
  body: string;
  isPrivate?: boolean;
  name?: string | null;
  submitter?: AuthUser | null;
}) {
  const session = await db.liveSession.findUnique({
    where: { id: input.sessionId },
    select: { id: true, prayerEnabled: true },
  });
  if (!session) return { ok: false as const, error: 'Live session not found.', status: 404 as const };
  if (!session.prayerEnabled) {
    return { ok: false as const, error: 'Prayer requests are disabled for this session.', status: 403 as const };
  }

  const body = sanitizePlainText(input.body, 2000);
  if (body.length < 5) {
    return { ok: false as const, error: 'Please share a brief prayer request.', status: 400 as const };
  }

  const row = await db.livePrayerRequest.create({
    data: {
      liveSessionId: session.id,
      submitterId: input.submitter?.id || null,
      name: input.name ? sanitizePlainText(input.name, 80) : input.submitter
        ? sanitizePlainText(
            `${input.submitter.firstName} ${input.submitter.lastName}`.trim(),
            80
          )
        : null,
      body,
      isPrivate: input.isPrivate ?? true,
    },
  });

  return { ok: true as const, prayer: row };
}

export async function listPublicLivePrayers(sessionId: string, limit = 30) {
  return db.livePrayerRequest.findMany({
    where: { liveSessionId: sessionId, isPrivate: false, status: { not: 'archived' } },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      name: true,
      body: true,
      status: true,
      createdAt: true,
    },
  });
}

export async function listAdminLivePrayers(sessionId: string, limit = 100) {
  return db.livePrayerRequest.findMany({
    where: { liveSessionId: sessionId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      submitter: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });
}

export async function updateLivePrayerStatus(input: {
  sessionId: string;
  prayerId: string;
  status: LivePrayerStatus;
}) {
  const row = await db.livePrayerRequest.findFirst({
    where: { id: input.prayerId, liveSessionId: input.sessionId },
  });
  if (!row) return { ok: false as const, error: 'Prayer request not found.' };

  const updated = await db.livePrayerRequest.update({
    where: { id: row.id },
    data: { status: input.status },
  });

  return { ok: true as const, prayer: updated };
}
