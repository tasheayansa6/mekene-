import { db } from '@/lib/db';
import { sanitizePlainText } from '@/lib/content/sanitize';
import { rateLimitKey } from '@/lib/auth/rate-limit';
import type { AuthUser } from '@/lib/auth/permissions';

export const CHAT_MAX_BODY = 400;
export const CHAT_DUPLICATE_WINDOW_MS = 30_000;

export function isDuplicateChatMessage(
  previous: { body: string; createdAt: Date } | null,
  body: string,
  now: Date = new Date()
): boolean {
  if (!previous) return false;
  if (previous.body !== body) return false;
  return now.getTime() - previous.createdAt.getTime() < CHAT_DUPLICATE_WINDOW_MS;
}

export function chatRateLimitKey(sessionId: string, userId: string): string {
  return `live:chat:${sessionId}:${userId}`;
}

export function enforceChatRateLimit(sessionId: string, userId: string) {
  return rateLimitKey(chatRateLimitKey(sessionId, userId), 20, 60_000);
}

export async function postLiveChatMessage(input: {
  sessionId: string;
  user: AuthUser;
  body: string;
}) {
  const session = await db.liveSession.findUnique({
    where: { id: input.sessionId },
    select: { id: true, chatEnabled: true, status: true },
  });
  if (!session) return { ok: false as const, error: 'Live session not found.', status: 404 as const };
  if (!session.chatEnabled) {
    return { ok: false as const, error: 'Chat is disabled for this session.', status: 403 as const };
  }
  if (session.status !== 'live' && session.status !== 'paused') {
    return { ok: false as const, error: 'Chat is only available during live sessions.', status: 403 as const };
  }

  const limited = enforceChatRateLimit(session.id, input.user.id);
  if (!limited.allowed) {
    return {
      ok: false as const,
      error: 'Please wait before sending another message.',
      status: 429 as const,
      retryAfterSeconds: limited.retryAfterSeconds,
    };
  }

  const body = sanitizePlainText(input.body, CHAT_MAX_BODY);
  if (body.length < 1) {
    return { ok: false as const, error: 'Message cannot be empty.', status: 400 as const };
  }

  const previous = await db.liveChatMessage.findFirst({
    where: { liveSessionId: session.id, userId: input.user.id },
    orderBy: { createdAt: 'desc' },
    select: { body: true, createdAt: true },
  });
  if (isDuplicateChatMessage(previous, body)) {
    return {
      ok: false as const,
      error: 'Please wait before sending the same message again.',
      status: 429 as const,
    };
  }

  const displayName =
    `${input.user.firstName} ${input.user.lastName}`.trim() || input.user.email.split('@')[0];

  const message = await db.liveChatMessage.create({
    data: {
      liveSessionId: session.id,
      userId: input.user.id,
      displayName: sanitizePlainText(displayName, 80),
      body,
    },
  });

  return { ok: true as const, message };
}

export async function listRecentChatMessages(sessionId: string, limit = 50) {
  return db.liveChatMessage.findMany({
    where: { liveSessionId: sessionId, status: 'visible' },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      displayName: true,
      body: true,
      createdAt: true,
      userId: true,
    },
  });
}

export async function listAdminChatMessages(sessionId: string, limit = 100) {
  return db.liveChatMessage.findMany({
    where: { liveSessionId: sessionId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });
}

export async function moderateChatMessage(input: {
  sessionId: string;
  messageId: string;
  action: 'hide' | 'delete' | 'mute';
  moderatorId: string;
  reason?: string | null;
  targetUserId?: string | null;
}) {
  const message = input.messageId
    ? await db.liveChatMessage.findFirst({
        where: { id: input.messageId, liveSessionId: input.sessionId },
      })
    : null;
  if (!message && input.action !== 'mute') {
    return { ok: false as const, error: 'Message not found.' };
  }

  if (input.action === 'mute' && !input.targetUserId && !message?.userId) {
    return { ok: false as const, error: 'A target user is required to mute.' };
  }

  if (input.action === 'hide' && message) {
    await db.liveChatMessage.update({
      where: { id: message.id },
      data: { status: 'hidden' },
    });
  } else if (input.action === 'delete' && message) {
    await db.liveChatMessage.update({
      where: { id: message.id },
      data: { status: 'deleted' },
    });
  }

  await db.liveChatModeration.create({
    data: {
      liveSessionId: input.sessionId,
      messageId: message?.id || null,
      action: input.action,
      reason: input.reason ? sanitizePlainText(input.reason, 400) : null,
      moderatorId: input.moderatorId,
      targetUserId: input.targetUserId ?? message?.userId ?? null,
    },
  });

  return { ok: true as const };
}
