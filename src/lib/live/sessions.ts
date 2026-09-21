import { db } from '@/lib/db';
import { slugify } from '@/lib/admin/slug';
import { sanitizePlainText } from '@/lib/content/sanitize';
import type {
  LiveSessionStatus,
  LiveStreamProvider,
  LiveVisibility,
} from '@prisma/client';
import { emitLiveAudit } from './audit';
import { resolveStreamConfig } from './providers';

const sessionInclude = {
  event: {
    select: {
      id: true,
      title: true,
      slug: true,
      startAt: true,
      endAt: true,
      isWorshipService: true,
    },
  },
  recordingSermon: {
    select: { id: true, title: true, slug: true, sermonDate: true },
  },
} as const;

export type LiveSessionWriteInput = {
  eventId: string;
  title?: string;
  description?: string | null;
  provider?: LiveStreamProvider;
  streamUrl?: string | null;
  backupStreamUrl?: string | null;
  visibility?: LiveVisibility;
  chatEnabled?: boolean;
  prayerEnabled?: boolean;
  attendanceEnabled?: boolean;
  reactionsEnabled?: boolean;
  pollsEnabled?: boolean;
  scheduledStartAt?: Date;
  scheduledEndAt?: Date | null;
  timezone?: string;
  seoTitle?: string | null;
  seoDescription?: string | null;
};

export type LiveSessionUpdateInput = Partial<
  Omit<LiveSessionWriteInput, 'eventId'> & {
    status?: LiveSessionStatus;
    thumbnailUrl?: string | null;
  }
>;

function liveSlugFromTitle(title: string, id: string): string {
  const base = slugify(title);
  const suffix = id.slice(-8);
  return `${base}-${suffix}`.slice(0, 100);
}

async function resolveStreamFields(
  provider: LiveStreamProvider,
  streamUrl?: string | null,
  backupStreamUrl?: string | null
) {
  const primary = streamUrl?.trim()
    ? resolveStreamConfig({ provider, streamUrl })
    : null;
  const backup = backupStreamUrl?.trim()
    ? resolveStreamConfig({ provider, streamUrl: backupStreamUrl })
    : null;

  if (streamUrl?.trim() && primary && !primary.ok) {
    return { ok: false as const, error: primary.error };
  }
  if (backupStreamUrl?.trim() && backup && !backup.ok) {
    return { ok: false as const, error: backup.error };
  }

  return {
    ok: true as const,
    embedUrl: primary?.ok ? primary.embedUrl : null,
    providerVideoId: primary?.ok ? primary.providerVideoId : null,
    backupEmbedUrl: backup?.ok ? backup.embedUrl : null,
  };
}

export async function createLiveSession(input: {
  data: LiveSessionWriteInput;
  createdById: string;
  request?: Request;
}) {
  const event = await db.event.findUnique({
    where: { id: input.data.eventId },
    select: { id: true, title: true, startAt: true, endAt: true, timezone: true },
  });
  if (!event) return { ok: false as const, error: 'Event not found.' };

  const provider = input.data.provider || 'youtube';
  const stream = await resolveStreamFields(
    provider,
    input.data.streamUrl,
    input.data.backupStreamUrl
  );
  if (!stream.ok) return { ok: false as const, error: stream.error };

  const title = sanitizePlainText(input.data.title || event.title, 200);

  let row = await db.liveSession.create({
    data: {
      eventId: event.id,
      title,
      slug: `pending-${Date.now().toString(36)}`,
      description: input.data.description
        ? sanitizePlainText(input.data.description, 4000)
        : null,
      provider,
      streamUrl: input.data.streamUrl?.trim() || null,
      embedUrl: stream.embedUrl,
      backupStreamUrl: input.data.backupStreamUrl?.trim() || null,
      backupEmbedUrl: stream.backupEmbedUrl,
      providerVideoId: stream.providerVideoId,
      visibility: input.data.visibility || 'public',
      chatEnabled: input.data.chatEnabled ?? true,
      prayerEnabled: input.data.prayerEnabled ?? true,
      attendanceEnabled: input.data.attendanceEnabled ?? true,
      reactionsEnabled: input.data.reactionsEnabled ?? true,
      pollsEnabled: input.data.pollsEnabled ?? false,
      scheduledStartAt: input.data.scheduledStartAt || event.startAt,
      scheduledEndAt: input.data.scheduledEndAt ?? event.endAt,
      timezone: input.data.timezone || event.timezone,
      seoTitle: input.data.seoTitle ? sanitizePlainText(input.data.seoTitle, 160) : null,
      seoDescription: input.data.seoDescription
        ? sanitizePlainText(input.data.seoDescription, 320)
        : null,
      createdById: input.createdById,
    },
    include: sessionInclude,
  });

  const slug = liveSlugFromTitle(title, row.id);
  if (slug !== row.slug) {
    row = await db.liveSession.update({
      where: { id: row.id },
      data: { slug },
      include: sessionInclude,
    });
  }

  await emitLiveAudit({
    action: 'live_session.created',
    sessionId: row.id,
    userId: input.createdById,
    request: input.request,
    details: { slug: row.slug, eventId: row.eventId },
  });

  return { ok: true as const, session: row };
}

export async function listAdminLiveSessions(options: {
  q?: string;
  status?: LiveSessionStatus;
  page?: number;
  pageSize?: number;
}) {
  const page = options.page || 1;
  const pageSize = options.pageSize || 20;
  const and: object[] = [];
  if (options.q?.trim()) {
    const q = options.q.trim();
    and.push({
      OR: [{ title: { contains: q } }, { slug: { contains: q } }, { event: { title: { contains: q } } }],
    });
  }
  if (options.status) and.push({ status: options.status });
  const where = and.length ? { AND: and } : {};

  const [totalItems, rows] = await Promise.all([
    db.liveSession.count({ where }),
    db.liveSession.findMany({
      where,
      include: sessionInclude,
      orderBy: { scheduledStartAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return { rows, page, pageSize, totalItems };
}

export async function getLiveSessionById(id: string) {
  return db.liveSession.findUnique({ where: { id }, include: sessionInclude });
}

export async function getLiveSessionBySlug(slug: string) {
  return db.liveSession.findUnique({ where: { slug }, include: sessionInclude });
}

export async function updateLiveSession(input: {
  id: string;
  data: LiveSessionUpdateInput;
  userId: string;
  request?: Request;
}) {
  const existing = await db.liveSession.findUnique({ where: { id: input.id } });
  if (!existing) return { ok: false as const, error: 'Live session not found.' };

  const provider = input.data.provider ?? existing.provider;
  const streamUrl =
    input.data.streamUrl !== undefined ? input.data.streamUrl : existing.streamUrl;
  const backupStreamUrl =
    input.data.backupStreamUrl !== undefined
      ? input.data.backupStreamUrl
      : existing.backupStreamUrl;

  const stream = await resolveStreamFields(provider, streamUrl, backupStreamUrl);
  if (!stream.ok) return { ok: false as const, error: stream.error };

  const row = await db.liveSession.update({
    where: { id: input.id },
    data: {
      ...(input.data.title !== undefined
        ? { title: sanitizePlainText(input.data.title, 200) }
        : {}),
      ...(input.data.description !== undefined
        ? {
            description: input.data.description
              ? sanitizePlainText(input.data.description, 4000)
              : null,
          }
        : {}),
      ...(input.data.provider !== undefined ? { provider: input.data.provider } : {}),
      ...(input.data.streamUrl !== undefined ? { streamUrl: input.data.streamUrl?.trim() || null } : {}),
      ...(input.data.backupStreamUrl !== undefined
        ? { backupStreamUrl: input.data.backupStreamUrl?.trim() || null }
        : {}),
      ...(streamUrl !== undefined || input.data.provider !== undefined
        ? { embedUrl: stream.embedUrl, providerVideoId: stream.providerVideoId }
        : {}),
      ...(backupStreamUrl !== undefined || input.data.provider !== undefined
        ? { backupEmbedUrl: stream.backupEmbedUrl }
        : {}),
      ...(input.data.visibility !== undefined ? { visibility: input.data.visibility } : {}),
      ...(input.data.chatEnabled !== undefined ? { chatEnabled: input.data.chatEnabled } : {}),
      ...(input.data.prayerEnabled !== undefined ? { prayerEnabled: input.data.prayerEnabled } : {}),
      ...(input.data.attendanceEnabled !== undefined
        ? { attendanceEnabled: input.data.attendanceEnabled }
        : {}),
      ...(input.data.reactionsEnabled !== undefined
        ? { reactionsEnabled: input.data.reactionsEnabled }
        : {}),
      ...(input.data.pollsEnabled !== undefined ? { pollsEnabled: input.data.pollsEnabled } : {}),
      ...(input.data.scheduledStartAt !== undefined
        ? { scheduledStartAt: input.data.scheduledStartAt }
        : {}),
      ...(input.data.scheduledEndAt !== undefined
        ? { scheduledEndAt: input.data.scheduledEndAt }
        : {}),
      ...(input.data.timezone !== undefined ? { timezone: input.data.timezone } : {}),
      ...(input.data.thumbnailUrl !== undefined
        ? { thumbnailUrl: input.data.thumbnailUrl?.trim() || null }
        : {}),
      ...(input.data.seoTitle !== undefined
        ? { seoTitle: input.data.seoTitle ? sanitizePlainText(input.data.seoTitle, 160) : null }
        : {}),
      ...(input.data.seoDescription !== undefined
        ? {
            seoDescription: input.data.seoDescription
              ? sanitizePlainText(input.data.seoDescription, 320)
              : null,
          }
        : {}),
    },
    include: sessionInclude,
  });

  await emitLiveAudit({
    action: 'live_session.updated',
    sessionId: row.id,
    userId: input.userId,
    request: input.request,
  });

  return { ok: true as const, session: row };
}

async function transitionStatus(input: {
  id: string;
  status: LiveSessionStatus;
  userId: string;
  request?: Request;
  extra?: Record<string, unknown>;
}) {
  const existing = await db.liveSession.findUnique({ where: { id: input.id } });
  if (!existing) return { ok: false as const, error: 'Live session not found.' };

  const row = await db.liveSession.update({
    where: { id: input.id },
    data: input.extra || {},
    include: sessionInclude,
  });

  await emitLiveAudit({
    action: `live_session.${input.status}`,
    sessionId: row.id,
    userId: input.userId,
    request: input.request,
    details: { status: input.status },
  });

  return { ok: true as const, session: row };
}

export async function activateLiveSession(id: string, userId: string, request?: Request) {
  return transitionStatus({
    id,
    status: 'live',
    userId,
    request,
    extra: {
      status: 'live',
      actualStartedAt: new Date(),
    },
  });
}

export async function endLiveSession(id: string, userId: string, request?: Request) {
  return transitionStatus({
    id,
    status: 'ended',
    userId,
    request,
    extra: {
      status: 'ended',
      actualEndedAt: new Date(),
    },
  });
}

export async function cancelLiveSession(id: string, userId: string, request?: Request) {
  return transitionStatus({
    id,
    status: 'cancelled',
    userId,
    request,
    extra: { status: 'cancelled' },
  });
}

export async function pauseLiveSession(id: string, userId: string, request?: Request) {
  return transitionStatus({
    id,
    status: 'paused',
    userId,
    request,
    extra: { status: 'paused' },
  });
}

export async function associateRecording(input: {
  id: string;
  sermonId: string;
  userId: string;
  request?: Request;
}) {
  const sermon = await db.sermon.findUnique({
    where: { id: input.sermonId },
    select: { id: true },
  });
  if (!sermon) return { ok: false as const, error: 'Sermon not found.' };

  const row = await db.liveSession.update({
    where: { id: input.id },
    data: { recordingSermonId: input.sermonId },
    include: sessionInclude,
  });

  await emitLiveAudit({
    action: 'live_session.recording_associated',
    sessionId: row.id,
    userId: input.userId,
    request: input.request,
    details: { sermonId: input.sermonId },
  });

  return { ok: true as const, session: row };
}

export async function setProgramCursor(input: {
  sessionId: string;
  programItemId: string;
  label?: string | null;
  userId: string;
  request?: Request;
}) {
  const session = await db.liveSession.findUnique({
    where: { id: input.sessionId },
    select: { id: true, eventId: true },
  });
  if (!session) return { ok: false as const, error: 'Live session not found.' };

  const program = await db.serviceProgram.findUnique({
    where: { eventId: session.eventId },
    include: { items: { select: { id: true } } },
  });
  if (!program || !program.items.some((item) => item.id === input.programItemId)) {
    return { ok: false as const, error: 'Program item does not belong to this event.' };
  }

  await db.liveProgramCursor.updateMany({
    where: { liveSessionId: input.sessionId, completedAt: null },
    data: { completedAt: new Date() },
  });

  const cursor = await db.liveProgramCursor.create({
    data: {
      liveSessionId: input.sessionId,
      programItemId: input.programItemId,
      label: input.label ? sanitizePlainText(input.label, 160) : null,
    },
  });

  const row = await db.liveSession.update({
    where: { id: input.sessionId },
    data: { currentProgramItemId: input.programItemId },
    include: sessionInclude,
  });

  await emitLiveAudit({
    action: 'live_session.program_cursor_set',
    sessionId: row.id,
    userId: input.userId,
    request: input.request,
    details: { programItemId: input.programItemId, cursorId: cursor.id },
  });

  return { ok: true as const, session: row, cursor };
}
