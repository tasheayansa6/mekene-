import { db } from '@/lib/db';
import { sanitizeMarkdown, sanitizeOptionalUrl, sanitizePlainText } from '@/lib/content/admin-write';
import type { AuthUser } from '@/lib/auth/permissions';
import { resolveEventWrite } from './access';
import { DEFAULT_EVENT_TIMEZONE, isValidTimeZone, parseEventDateTime } from './timezone';
import type { EventStatusValue } from './status';
import type { RecurrenceRule } from './recurrence';

export interface EventWriteInput {
  title?: string;
  slug?: string;
  description?: string | null;
  shortDescription?: string | null;
  categoryId?: string | null;
  ministryId?: string | null;
  organizerLeaderId?: string | null;
  organizerName?: string | null;
  locationId?: string | null;
  isOnline?: boolean;
  meetingUrl?: string | null;
  startAt?: string;
  endAt?: string;
  timezone?: string;
  recurrence?: RecurrenceRule;
  recurrenceInterval?: number;
  recurrenceUntil?: string | null;
  featuredImageUrl?: string | null;
  featuredImageAlt?: string | null;
  registrationRequired?: boolean;
  registrationUrl?: string | null;
  capacity?: number | null;
  allowOverVenueCapacity?: boolean;
  isWorshipService?: boolean;
  serviceLabel?: string | null;
  registrationDeadline?: string | null;
  status?: EventStatusValue;
  isFeatured?: boolean;
  allowVenueConflict?: boolean;
  seoTitle?: string | null;
  seoDescription?: string | null;
  ogImageUrl?: string | null;
  publishAt?: string | null;
}

export async function assignedMinistryId(user: AuthUser): Promise<string | null> {
  if (user.role.slug !== 'ministry_leader') return null;
  const ministry = await db.ministry.findFirst({
    where: { leaderUserId: user.id },
    select: { id: true },
  });
  return ministry?.id ?? null;
}

export async function resolveMinistryForWrite(user: AuthUser, requested?: string | null) {
  const assigned = await assignedMinistryId(user);
  if (user.role.slug === 'ministry_leader') {
    if (!assigned) {
      return { ok: false as const, error: 'You must be assigned to a ministry before managing events.' };
    }
    return { ok: true as const, ministryId: assigned };
  }
  return { ok: true as const, ministryId: requested || null };
}

export function prepareEventFields(
  data: EventWriteInput,
  options: {
    user: AuthUser;
    existing?: {
      startAt: Date;
      endAt: Date;
      timezone: string;
      status: string;
      publishAt: Date | null;
    };
    defaultTimezone: string;
  }
):
  | { ok: true; fields: Record<string, unknown>; resolved: { status: EventStatusValue; publishedAt: Date | null } }
  | { ok: false; errors: Record<string, string[]> } {
  const errors: Record<string, string[]> = {};
  const timezone =
    data.timezone && isValidTimeZone(data.timezone)
      ? data.timezone
      : options.existing?.timezone || options.defaultTimezone || DEFAULT_EVENT_TIMEZONE;

  const startAt =
    data.startAt !== undefined
      ? parseEventDateTime(data.startAt, timezone)
      : options.existing?.startAt || null;
  const endAt =
    data.endAt !== undefined ? parseEventDateTime(data.endAt, timezone) : options.existing?.endAt || null;

  if (!startAt) errors.startAt = ['Start date is required.'];
  if (!endAt) errors.endAt = ['End date is required.'];
  if (startAt && endAt && endAt <= startAt) {
    errors.endAt = ['End must be after the start date and time.'];
  }

  let recurrenceUntil: Date | null | undefined;
  if (data.recurrenceUntil !== undefined) {
    recurrenceUntil = data.recurrenceUntil ? parseEventDateTime(data.recurrenceUntil, timezone) : null;
    if (data.recurrenceUntil && !recurrenceUntil) {
      errors.recurrenceUntil = ['Recurrence end date is invalid.'];
    }
    if (startAt && recurrenceUntil && recurrenceUntil < startAt) {
      errors.recurrenceUntil = ['Recurrence must end after the first occurrence.'];
    }
  }

  let registrationDeadline: Date | null | undefined;
  if (data.registrationDeadline !== undefined) {
    registrationDeadline = data.registrationDeadline
      ? parseEventDateTime(data.registrationDeadline, timezone)
      : null;
    if (data.registrationDeadline && !registrationDeadline) {
      errors.registrationDeadline = ['Registration deadline is invalid.'];
    }
    if (startAt && registrationDeadline && registrationDeadline > startAt) {
      errors.registrationDeadline = ['Registration should close before the event starts.'];
    }
  }

  const recurrence = data.recurrence || 'none';
  if (recurrence !== 'none' && data.recurrenceInterval !== undefined && data.recurrenceInterval < 1) {
    errors.recurrenceInterval = ['Recurrence interval must be at least 1.'];
  }

  const urlFields: Array<keyof EventWriteInput> = ['meetingUrl', 'registrationUrl', 'featuredImageUrl', 'ogImageUrl'];
  for (const key of urlFields) {
    if (data[key] === undefined) continue;
    try {
      sanitizeOptionalUrl(data[key] as string | null);
    } catch {
      errors[key] = ['Links must use http(s) or an uploaded file path.'];
    }
  }

  if (Object.keys(errors).length) return { ok: false, errors };

  const publishAt = data.publishAt !== undefined ? parseEventDateTime(data.publishAt, timezone) : options.existing?.publishAt ?? null;
  const resolved = resolveEventWrite(options.user, {
    status: (data.status ?? options.existing?.status) as EventStatusValue | undefined,
    publishAt,
  });

  const fields: Record<string, unknown> = {};
  if (data.title !== undefined) fields.title = sanitizePlainText(data.title, 180);
  if (data.description !== undefined) {
    fields.description = data.description ? sanitizeMarkdown(data.description, 20_000) : null;
  }
  if (data.shortDescription !== undefined) {
    fields.shortDescription = data.shortDescription ? sanitizePlainText(data.shortDescription, 400) : null;
  }
  if (data.categoryId !== undefined) fields.categoryId = data.categoryId || null;
  if (data.organizerLeaderId !== undefined) fields.organizerLeaderId = data.organizerLeaderId || null;
  if (data.organizerName !== undefined) {
    fields.organizerName = data.organizerName ? sanitizePlainText(data.organizerName, 120) : null;
  }
  if (data.locationId !== undefined) fields.locationId = data.locationId || null;
  if (data.isOnline !== undefined) fields.isOnline = data.isOnline;
  if (data.meetingUrl !== undefined) fields.meetingUrl = sanitizeOptionalUrl(data.meetingUrl);
  if (data.startAt !== undefined) fields.startAt = startAt;
  if (data.endAt !== undefined) fields.endAt = endAt;
  if (data.timezone !== undefined || !options.existing) fields.timezone = timezone;
  if (data.recurrence !== undefined) fields.recurrence = data.recurrence;
  if (data.recurrenceInterval !== undefined) fields.recurrenceInterval = data.recurrenceInterval;
  if (data.recurrenceUntil !== undefined) fields.recurrenceUntil = recurrenceUntil;
  if (data.featuredImageUrl !== undefined) fields.featuredImageUrl = sanitizeOptionalUrl(data.featuredImageUrl);
  if (data.featuredImageAlt !== undefined) {
    fields.featuredImageAlt = data.featuredImageAlt ? sanitizePlainText(data.featuredImageAlt, 180) : null;
  }
  if (data.registrationRequired !== undefined) fields.registrationRequired = data.registrationRequired;
  if (data.registrationUrl !== undefined) fields.registrationUrl = sanitizeOptionalUrl(data.registrationUrl);
  if (data.capacity !== undefined) fields.capacity = data.capacity ?? null;
  if (data.allowOverVenueCapacity !== undefined) {
    fields.allowOverVenueCapacity = data.allowOverVenueCapacity;
  }
  if (data.isWorshipService !== undefined) fields.isWorshipService = data.isWorshipService;
  if (data.serviceLabel !== undefined) {
    fields.serviceLabel = data.serviceLabel ? sanitizePlainText(data.serviceLabel, 120) : null;
  }
  if (data.registrationDeadline !== undefined) fields.registrationDeadline = registrationDeadline;
  if (data.status !== undefined) {
    fields.status = resolved.status;
    fields.publishedAt = resolved.publishedAt;
  }
  if (data.isFeatured !== undefined) fields.isFeatured = data.isFeatured;
  if (data.seoTitle !== undefined) fields.seoTitle = data.seoTitle ? sanitizePlainText(data.seoTitle, 70) : null;
  if (data.seoDescription !== undefined) {
    fields.seoDescription = data.seoDescription ? sanitizePlainText(data.seoDescription, 160) : null;
  }
  if (data.ogImageUrl !== undefined) fields.ogImageUrl = sanitizeOptionalUrl(data.ogImageUrl);
  if (data.publishAt !== undefined) fields.publishAt = publishAt;

  return { ok: true, fields, resolved };
}
