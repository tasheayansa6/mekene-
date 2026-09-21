import { db } from '@/lib/db';
import type { AuthUser } from '@/lib/auth/permissions';
import { deriveDisplayStatus, canPublicView, isPubliclyLive, isListableStatus } from './status';
import { aggregateLiveReactions } from './reactions';
import { listActiveAnnouncements } from './announcements';
import { listActivePollResults } from './polls';

const publicSessionSelect = {
  id: true,
  title: true,
  slug: true,
  description: true,
  status: true,
  provider: true,
  embedUrl: true,
  backupEmbedUrl: true,
  thumbnailUrl: true,
  visibility: true,
  chatEnabled: true,
  prayerEnabled: true,
  attendanceEnabled: true,
  reactionsEnabled: true,
  pollsEnabled: true,
  scheduledStartAt: true,
  scheduledEndAt: true,
  actualStartedAt: true,
  actualEndedAt: true,
  timezone: true,
  approximateViewers: true,
  currentProgramItemId: true,
  eventId: true,
  recordingSermonId: true,
  event: {
    select: {
      id: true,
      title: true,
      slug: true,
      startAt: true,
      endAt: true,
      isWorshipService: true,
      serviceLabel: true,
    },
  },
  recordingSermon: {
    select: {
      id: true,
      title: true,
      slug: true,
      sermonDate: true,
      videoUrl: true,
      thumbnailUrl: true,
    },
  },
} as const;

function serializeRecording(sermon: {
  id: string;
  title: string;
  slug: string;
  sermonDate: Date;
  videoUrl: string | null;
  thumbnailUrl: string | null;
} | null) {
  if (!sermon) return null;
  return {
    id: sermon.id,
    title: sermon.title,
    slug: sermon.slug,
    sermonDate: sermon.sermonDate.toISOString(),
    hasVideo: Boolean(sermon.videoUrl),
    thumbnailUrl: sermon.thumbnailUrl,
  };
}

function serializePublicSession(
  row: Awaited<ReturnType<typeof db.liveSession.findFirst>>,
  user: AuthUser | null,
  now: Date
) {
  if (!row || !canPublicView(row, user)) return null;

  const displayStatus = deriveDisplayStatus(row, now);
  const isLive = isPubliclyLive(row);

  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    status: row.status,
    displayStatus,
    isLive,
    provider: row.provider,
    embedUrl: isLive || displayStatus === 'starting_soon' ? row.embedUrl : null,
    backupEmbedUrl: isLive ? row.backupEmbedUrl : null,
    thumbnailUrl: row.thumbnailUrl,
    visibility: row.visibility,
    chatEnabled: row.chatEnabled,
    prayerEnabled: row.prayerEnabled,
    attendanceEnabled: row.attendanceEnabled,
    reactionsEnabled: row.reactionsEnabled,
    pollsEnabled: row.pollsEnabled,
    scheduledStartAt: row.scheduledStartAt.toISOString(),
    scheduledEndAt: row.scheduledEndAt?.toISOString() ?? null,
    actualStartedAt: row.actualStartedAt?.toISOString() ?? null,
    actualEndedAt: row.actualEndedAt?.toISOString() ?? null,
    timezone: row.timezone,
    approximateViewers: row.approximateViewers,
    currentProgramItemId: row.currentProgramItemId,
    event: row.event,
    recording: serializeRecording(row.recordingSermon),
  };
}

export async function getLiveNow(user: AuthUser | null = null) {
  const now = new Date();
  const row = await db.liveSession.findFirst({
    where: { status: 'live' },
    select: publicSessionSelect,
    orderBy: { actualStartedAt: 'desc' },
  });
  return serializePublicSession(row, user, now);
}

export async function getUpcomingLive(user: AuthUser | null = null, limit = 10) {
  const now = new Date();
  const rows = await db.liveSession.findMany({
    where: {
      status: { in: ['scheduled', 'paused'] },
      scheduledStartAt: { gte: new Date(now.getTime() - 60 * 60 * 1000) },
    },
    select: publicSessionSelect,
    orderBy: { scheduledStartAt: 'asc' },
    take: limit,
  });

  return rows
    .map((row) => serializePublicSession(row, user, now))
    .filter(Boolean);
}

export async function getLiveBySlug(slug: string, user: AuthUser | null = null) {
  const now = new Date();
  const row = await db.liveSession.findUnique({
    where: { slug },
    select: publicSessionSelect,
  });
  if (!row || !isListableStatus(row.status)) return null;

  const base = serializePublicSession(row, user, now);
  if (!base) return null;

  const [program, announcements, reactions, polls] = await Promise.all([
    db.serviceProgram.findUnique({
      where: { eventId: row.eventId },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            title: true,
            itemType: true,
            description: true,
            durationMinutes: true,
            responsibleLabel: true,
            sortOrder: true,
            status: true,
          },
        },
      },
    }),
    listActiveAnnouncements(row.id, now),
    row.reactionsEnabled ? aggregateLiveReactions(row.id, now) : null,
    row.pollsEnabled ? listActivePollResults(row.id) : [],
  ]);

  const programItems =
    program?.isPublic !== false
      ? program?.items.map((item) => ({
          ...item,
          isCurrent: item.id === row.currentProgramItemId,
        })) ?? []
      : [];

  return {
    ...base,
    program: program
      ? {
          id: program.id,
          title: program.title,
          notes: program.isPublic !== false ? program.notes : null,
          items: programItems,
        }
      : null,
    announcements,
    reactions,
    polls,
  };
}

export async function getLiveBadgeForEvent(eventId: string, user: AuthUser | null = null) {
  const now = new Date();
  const session = await db.liveSession.findFirst({
    where: {
      eventId,
      status: { in: ['live', 'scheduled', 'paused'] },
    },
    select: publicSessionSelect,
    orderBy: { scheduledStartAt: 'asc' },
  });
  if (!session) return null;
  const serialized = serializePublicSession(session, user, now);
  if (!serialized) return null;
  return {
    slug: serialized.slug,
    displayStatus: serialized.displayStatus,
    isLive: serialized.isLive,
    scheduledStartAt: serialized.scheduledStartAt,
  };
}
