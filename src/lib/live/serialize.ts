import type { LiveSession } from '@prisma/client';
import { deriveDisplayStatus, isPubliclyLive } from './status';

export function serializeAdminLiveSession(
  row: LiveSession & {
    event?: {
      id: string;
      title: string;
      slug: string;
      startAt: Date;
      endAt: Date;
      isWorshipService: boolean;
    };
    recordingSermon?: {
      id: string;
      title: string;
      slug: string;
      sermonDate: Date;
    } | null;
  },
  now: Date = new Date()
) {
  return {
    id: row.id,
    eventId: row.eventId,
    title: row.title,
    slug: row.slug,
    description: row.description,
    status: row.status,
    displayStatus: deriveDisplayStatus(row, now),
    isLive: isPubliclyLive(row),
    provider: row.provider,
    streamUrl: row.streamUrl,
    embedUrl: row.embedUrl,
    backupStreamUrl: row.backupStreamUrl,
    backupEmbedUrl: row.backupEmbedUrl,
    providerVideoId: row.providerVideoId,
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
    peakViewers: row.peakViewers,
    approximateViewers: row.approximateViewers,
    currentProgramItemId: row.currentProgramItemId,
    recordingSermonId: row.recordingSermonId,
    event: row.event
      ? {
          ...row.event,
          startAt: row.event.startAt.toISOString(),
          endAt: row.event.endAt.toISOString(),
        }
      : null,
    recordingSermon: row.recordingSermon
      ? {
          ...row.recordingSermon,
          sermonDate: row.recordingSermon.sermonDate.toISOString(),
        }
      : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
