import { db } from '@/lib/db';
import { sanitizePlainText } from '@/lib/content/sanitize';

export async function createLivePoll(input: {
  sessionId: string;
  question: string;
  options: string[];
}) {
  const session = await db.liveSession.findUnique({
    where: { id: input.sessionId },
    select: { id: true, pollsEnabled: true },
  });
  if (!session) return { ok: false as const, error: 'Live session not found.' };
  if (!session.pollsEnabled) {
    return { ok: false as const, error: 'Polls are disabled for this session.' };
  }

  const question = sanitizePlainText(input.question, 300);
  const labels = input.options
    .map((label) => sanitizePlainText(label, 120))
    .filter(Boolean)
    .slice(0, 8);
  if (labels.length < 2) {
    return { ok: false as const, error: 'Provide at least two poll options.' };
  }

  const poll = await db.livePoll.create({
    data: {
      liveSessionId: session.id,
      question,
      options: {
        create: labels.map((label, index) => ({ label, sortOrder: index })),
      },
    },
    include: { options: { orderBy: { sortOrder: 'asc' } } },
  });

  return { ok: true as const, poll };
}

export async function activateLivePoll(sessionId: string, pollId: string) {
  const poll = await db.livePoll.findFirst({
    where: { id: pollId, liveSessionId: sessionId },
  });
  if (!poll) return { ok: false as const, error: 'Poll not found.' };

  await db.livePoll.updateMany({
    where: { liveSessionId: sessionId, isActive: true },
    data: { isActive: false, closedAt: new Date() },
  });

  const updated = await db.livePoll.update({
    where: { id: pollId },
    data: { isActive: true, closedAt: null },
    include: { options: { orderBy: { sortOrder: 'asc' } } },
  });

  return { ok: true as const, poll: updated };
}

export async function closeLivePoll(sessionId: string, pollId: string) {
  const poll = await db.livePoll.findFirst({
    where: { id: pollId, liveSessionId: sessionId },
  });
  if (!poll) return { ok: false as const, error: 'Poll not found.' };

  const updated = await db.livePoll.update({
    where: { id: pollId },
    data: { isActive: false, closedAt: new Date() },
    include: { options: { orderBy: { sortOrder: 'asc' } } },
  });

  return { ok: true as const, poll: updated };
}

export async function listLivePolls(sessionId: string) {
  return db.livePoll.findMany({
    where: { liveSessionId: sessionId },
    include: { options: { orderBy: { sortOrder: 'asc' } } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function voteLivePoll(input: {
  sessionId: string;
  pollId: string;
  optionId: string;
  userId?: string | null;
  visitorKey?: string | null;
}) {
  if (!input.userId && !input.visitorKey) {
    return { ok: false as const, error: 'A user or visitor key is required.' };
  }

  const poll = await db.livePoll.findFirst({
    where: { id: input.pollId, liveSessionId: input.sessionId, isActive: true },
    include: { options: true },
  });
  if (!poll) return { ok: false as const, error: 'Active poll not found.' };
  if (!poll.options.some((option) => option.id === input.optionId)) {
    return { ok: false as const, error: 'Invalid poll option.' };
  }

  try {
    await db.livePollResponse.create({
      data: {
        pollId: poll.id,
        optionId: input.optionId,
        userId: input.userId || null,
        visitorKey: input.userId ? null : input.visitorKey || null,
      },
    });
    return { ok: true as const, alreadyVoted: false };
  } catch {
    return { ok: true as const, alreadyVoted: true };
  }
}

export async function aggregatePollResults(sessionId: string, pollId: string) {
  const poll = await db.livePoll.findFirst({
    where: { id: pollId, liveSessionId: sessionId },
    include: { options: { orderBy: { sortOrder: 'asc' } } },
  });
  if (!poll) return null;

  const counts = await db.livePollResponse.groupBy({
    by: ['optionId'],
    where: { pollId: poll.id },
    _count: { optionId: true },
  });
  const countMap = new Map(counts.map((row) => [row.optionId, row._count.optionId]));

  return {
    id: poll.id,
    question: poll.question,
    isActive: poll.isActive,
    closedAt: poll.closedAt?.toISOString() ?? null,
    options: poll.options.map((option) => ({
      id: option.id,
      label: option.label,
      votes: countMap.get(option.id) || 0,
    })),
    totalVotes: counts.reduce((sum, row) => sum + row._count.optionId, 0),
  };
}

export async function listActivePollResults(sessionId: string) {
  const polls = await db.livePoll.findMany({
    where: { liveSessionId: sessionId, isActive: true },
    select: { id: true },
  });
  const results = await Promise.all(
    polls.map((poll) => aggregatePollResults(sessionId, poll.id))
  );
  return results.filter(Boolean);
}
