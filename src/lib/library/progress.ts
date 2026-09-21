import { db } from '@/lib/db';
import { rateLimitKey } from '@/lib/auth/rate-limit';
import { isPubliclyVisible } from '@/lib/content/status';
import { sermonInclude, serializeSermon } from '@/lib/sermons/serialize';

const PROGRESS_UPDATE_MIN_INTERVAL_MS = 5_000;

export async function upsertProgress(input: {
  userId: string;
  sermonId: string;
  positionSeconds: number;
  durationSeconds?: number | null;
}) {
  const limited = rateLimitKey(
    `library-progress:${input.userId}:${input.sermonId}`,
    1,
    PROGRESS_UPDATE_MIN_INTERVAL_MS
  );
  if (!limited.allowed) {
    const existing = await getProgress(input.userId, input.sermonId);
    return { progress: existing, throttled: true as const };
  }

  const sermon = await db.sermon.findUnique({ where: { id: input.sermonId } });
  if (!sermon || !isPubliclyVisible(sermon)) return null;

  const position = Math.max(0, input.positionSeconds);
  const duration =
    input.durationSeconds != null && Number.isFinite(input.durationSeconds)
      ? Math.max(0, input.durationSeconds)
      : null;
  const completedAt =
    duration != null && duration > 0 && position / duration >= 0.95 ? new Date() : null;

  const progress = await db.mediaPlaybackProgress.upsert({
    where: {
      userId_sermonId: { userId: input.userId, sermonId: input.sermonId },
    },
    update: {
      positionSeconds: position,
      ...(duration != null ? { durationSeconds: duration } : {}),
      ...(completedAt ? { completedAt } : {}),
    },
    create: {
      userId: input.userId,
      sermonId: input.sermonId,
      positionSeconds: position,
      durationSeconds: duration,
      completedAt,
    },
  });

  return {
    progress: {
      sermonId: progress.sermonId,
      positionSeconds: progress.positionSeconds,
      durationSeconds: progress.durationSeconds,
      completedAt: progress.completedAt?.toISOString() ?? null,
      updatedAt: progress.updatedAt.toISOString(),
    },
    throttled: false as const,
  };
}

export async function getProgress(userId: string, sermonId: string) {
  const progress = await db.mediaPlaybackProgress.findUnique({
    where: { userId_sermonId: { userId, sermonId } },
  });
  if (!progress) return null;
  return {
    sermonId: progress.sermonId,
    positionSeconds: progress.positionSeconds,
    durationSeconds: progress.durationSeconds,
    completedAt: progress.completedAt?.toISOString() ?? null,
    updatedAt: progress.updatedAt.toISOString(),
  };
}

export async function listContinueWatching(userId: string, limit = 12) {
  const rows = await db.mediaPlaybackProgress.findMany({
    where: {
      userId,
      completedAt: null,
      positionSeconds: { gt: 0 },
    },
    orderBy: { updatedAt: 'desc' },
    take: limit,
    include: {
      sermon: { include: sermonInclude },
    },
  });

  return rows
    .filter((row) => isPubliclyVisible(row.sermon))
    .map((row) => ({
      progress: {
        sermonId: row.sermonId,
        positionSeconds: row.positionSeconds,
        durationSeconds: row.durationSeconds,
        updatedAt: row.updatedAt.toISOString(),
      },
      sermon: serializeSermon(row.sermon, { forPublic: true }),
      href: `/sermons/${row.sermon.slug}`,
    }));
}

export async function clearHistory(userId: string) {
  const result = await db.mediaPlaybackProgress.deleteMany({ where: { userId } });
  return { deleted: result.count };
}

/** Ensures progress queries never cross user boundaries. */
export function assertProgressOwner(userId: string, ownerId: string): boolean {
  return userId === ownerId;
}
