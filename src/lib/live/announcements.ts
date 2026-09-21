import { db } from '@/lib/db';
import { sanitizePlainText } from '@/lib/content/sanitize';

export async function createLiveAnnouncement(input: {
  sessionId: string;
  body: string;
  isPinned?: boolean;
  expiresAt?: Date | null;
  authorId?: string | null;
}) {
  const body = sanitizePlainText(input.body, 500);
  if (!body) return { ok: false as const, error: 'Announcement body is required.' };

  if (input.isPinned) {
    await db.liveAnnouncement.updateMany({
      where: { liveSessionId: input.sessionId, isPinned: true },
      data: { isPinned: false },
    });
  }

  const row = await db.liveAnnouncement.create({
    data: {
      liveSessionId: input.sessionId,
      body,
      isPinned: input.isPinned ?? true,
      expiresAt: input.expiresAt ?? null,
      authorId: input.authorId || null,
    },
  });

  return { ok: true as const, announcement: row };
}

export async function listActiveAnnouncements(sessionId: string, now: Date = new Date()) {
  return db.liveAnnouncement.findMany({
    where: {
      liveSessionId: sessionId,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      body: true,
      isPinned: true,
      createdAt: true,
      expiresAt: true,
    },
  });
}
