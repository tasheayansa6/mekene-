import { db } from '@/lib/db';
import { rateLimitKey } from '@/lib/auth/rate-limit';

export const ALLOWED_REACTIONS = ['❤️', '🙏', 'Amen'] as const;
export type AllowedReaction = (typeof ALLOWED_REACTIONS)[number];

const REACTION_WINDOW_MS = 60_000;

export function isAllowedReaction(emoji: string): emoji is AllowedReaction {
  return (ALLOWED_REACTIONS as readonly string[]).includes(emoji);
}

export function reactionRateLimitKey(sessionId: string, actorKey: string): string {
  return `live:react:${sessionId}:${actorKey}`;
}

export function enforceReactionRateLimit(sessionId: string, actorKey: string) {
  return rateLimitKey(reactionRateLimitKey(sessionId, actorKey), 30, 60_000);
}

export async function addLiveReaction(input: {
  sessionId: string;
  emoji: string;
  userId?: string | null;
  visitorKey?: string | null;
}) {
  if (!isAllowedReaction(input.emoji)) {
    return { ok: false as const, error: 'Reaction not allowed.', status: 400 as const };
  }
  if (!input.userId && !input.visitorKey) {
    return { ok: false as const, error: 'A user or visitor key is required.', status: 400 as const };
  }

  const session = await db.liveSession.findUnique({
    where: { id: input.sessionId },
    select: { id: true, reactionsEnabled: true, status: true },
  });
  if (!session) return { ok: false as const, error: 'Live session not found.', status: 404 as const };
  if (!session.reactionsEnabled) {
    return { ok: false as const, error: 'Reactions are disabled for this session.', status: 403 as const };
  }
  if (session.status !== 'live' && session.status !== 'paused') {
    return { ok: false as const, error: 'Reactions are only available during live sessions.', status: 403 as const };
  }

  const actorKey = input.userId || input.visitorKey!;
  const limited = enforceReactionRateLimit(session.id, actorKey);
  if (!limited.allowed) {
    return {
      ok: false as const,
      error: 'Please wait before reacting again.',
      status: 429 as const,
      retryAfterSeconds: limited.retryAfterSeconds,
    };
  }

  const reaction = await db.liveReaction.create({
    data: {
      liveSessionId: session.id,
      userId: input.userId || null,
      visitorKey: input.userId ? null : input.visitorKey || null,
      emoji: input.emoji,
    },
  });

  return { ok: true as const, reaction };
}

export async function aggregateLiveReactions(sessionId: string, now: Date = new Date()) {
  const since = new Date(now.getTime() - REACTION_WINDOW_MS);
  const rows = await db.liveReaction.groupBy({
    by: ['emoji'],
    where: { liveSessionId: sessionId, createdAt: { gte: since } },
    _count: { emoji: true },
  });

  const counts: Record<string, number> = {};
  for (const emoji of ALLOWED_REACTIONS) {
    counts[emoji] = 0;
  }
  for (const row of rows) {
    if (isAllowedReaction(row.emoji)) {
      counts[row.emoji] = row._count.emoji;
    }
  }
  return { windowSeconds: REACTION_WINDOW_MS / 1000, counts };
}
