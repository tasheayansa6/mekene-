export const EVENT_STATUSES = [
  'draft',
  'review',
  'scheduled',
  'published',
  'cancelled',
  'completed',
  'archived',
] as const;

export type EventStatusValue = (typeof EVENT_STATUSES)[number];

export const PUBLIC_EVENT_STATUSES = new Set(['published', 'cancelled', 'completed']);

export interface EventPublishable {
  status: string;
  publishAt: Date | null;
  startAt?: Date;
  endAt?: Date;
}

export function isEventPubliclyVisible(item: EventPublishable, now = new Date()): boolean {
  if (item.status === 'archived' || item.status === 'draft' || item.status === 'review') {
    return false;
  }
  if (item.status === 'scheduled') {
    return Boolean(item.publishAt) && item.publishAt! <= now;
  }
  if (PUBLIC_EVENT_STATUSES.has(item.status)) {
    if (item.publishAt && item.publishAt > now) return false;
    return true;
  }
  return false;
}

export function publicEventStatusWhere(now = new Date()) {
  return {
    OR: [
      {
        status: { in: ['published', 'cancelled', 'completed'] as EventStatusValue[] },
        AND: [{ OR: [{ publishAt: null }, { publishAt: { lte: now } }] }],
      },
      {
        status: 'scheduled' as const,
        publishAt: { lte: now },
      },
    ],
  };
}

export function resolveEventStatusOnSave(input: {
  status?: EventStatusValue | null;
  publishAt?: Date | null;
  now?: Date;
}): { status: EventStatusValue; publishedAt: Date | null } {
  const now = input.now ?? new Date();
  let status = input.status || 'draft';
  if (status === 'cancelled' || status === 'completed' || status === 'archived' || status === 'review') {
    return { status, publishedAt: status === 'cancelled' || status === 'completed' ? input.publishAt ?? now : null };
  }
  if (status === 'published' && input.publishAt && input.publishAt > now) {
    status = 'scheduled';
  }
  if (status === 'scheduled' && (!input.publishAt || input.publishAt <= now)) {
    status = 'published';
  }
  const publishedAt =
    status === 'published' ? (input.publishAt && input.publishAt <= now ? input.publishAt : now) : null;
  return { status, publishedAt };
}

export function isUpcomingEvent(item: { endAt: Date; status: string }, now = new Date()) {
  return item.endAt >= now && item.status !== 'completed' && item.status !== 'archived';
}

export function isPastEvent(item: { endAt: Date }, now = new Date()) {
  return item.endAt < now;
}

export function isStartingSoon(startAt: Date, now = new Date(), windowMs = 60 * 60 * 1000) {
  const start = startAt.getTime();
  const current = now.getTime();
  return start > current && start <= current + windowMs;
}
