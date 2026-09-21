import { authorSelect, serializeAuthor, seoDefaults } from '@/lib/content/query';
import { recurrenceLabel } from './recurrence';

export const eventInclude = {
  author: { select: authorSelect },
  category: { select: { id: true, name: true, slug: true } },
  ministry: { select: { id: true, name: true, slug: true, leaderUserId: true } },
  organizerLeader: { select: { id: true, firstName: true, lastName: true, title: true } },
  location: {
    select: {
      id: true,
      name: true,
      slug: true,
      address: true,
      mapUrl: true,
      latitude: true,
      longitude: true,
      capacity: true,
      facilities: true,
    },
  },
} as const;

function iso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

export function organizerLabel(input: {
  organizerName: string | null;
  organizerLeader: { firstName: string; lastName: string } | null;
}) {
  if (input.organizerLeader) {
    return `${input.organizerLeader.firstName} ${input.organizerLeader.lastName}`.trim();
  }
  return input.organizerName?.trim() || null;
}

export function serializeEvent(
  row: {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    shortDescription: string | null;
    categoryId: string | null;
    ministryId: string | null;
    organizerLeaderId: string | null;
    organizerName: string | null;
    locationId: string | null;
    isOnline: boolean;
    isHybrid?: boolean;
    meetingUrl: string | null;
    locationVisibility?: string;
    startAt: Date;
    endAt: Date;
    timezone: string;
    recurrence: string;
    recurrenceInterval: number;
    recurrenceUntil: Date | null;
    featuredImageUrl: string | null;
    featuredImageAlt: string | null;
    registrationRequired: boolean;
    registrationUrl: string | null;
    capacity: number | null;
    allowOverVenueCapacity?: boolean;
    isWorshipService?: boolean;
    serviceLabel?: string | null;
    registrationDeadline: Date | null;
    waitlistEnabled?: boolean;
    allowGuestRegistration?: boolean;
    registrationAccess?: string;
    reminderOffsetsMinutes?: string | null;
    status: string;
    isFeatured: boolean;
    seoTitle: string | null;
    seoDescription: string | null;
    ogImageUrl: string | null;
    publishedAt: Date | null;
    publishAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    author: { id: string; firstName: string; lastName: string };
    category: { id: string; name: string; slug: string } | null;
    ministry: { id: string; name: string; slug: string; leaderUserId?: string | null } | null;
    organizerLeader: { id: string; firstName: string; lastName: string; title: string | null } | null;
    location: {
      id: string;
      name: string;
      slug: string;
      address: string | null;
      mapUrl: string | null;
      latitude: number | null;
      longitude: number | null;
      capacity?: number | null;
      facilities?: string | null;
    } | null;
  },
  options?: { includeMeetingUrl?: boolean; isAuthenticated?: boolean }
) {
  const seo = seoDefaults({
    title: row.title,
    excerpt: row.shortDescription || row.description,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    featuredImageUrl: row.featuredImageUrl,
    ogImageUrl: row.ogImageUrl,
  });
  const visibility = row.locationVisibility || 'public';
  const canSeeMeeting =
    options?.includeMeetingUrl !== false &&
    (visibility === 'public' || (visibility === 'members' && options?.isAuthenticated));
  const canSeeLocation = visibility === 'public' || (visibility === 'members' && options?.isAuthenticated);

  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    shortDescription: row.shortDescription,
    categoryId: row.categoryId,
    category: row.category,
    ministryId: row.ministryId,
    ministry: row.ministry
      ? { id: row.ministry.id, name: row.ministry.name, slug: row.ministry.slug }
      : null,
    organizerLeaderId: row.organizerLeaderId,
    organizerName: organizerLabel(row),
    organizer: row.organizerLeader
      ? {
          id: row.organizerLeader.id,
          name: `${row.organizerLeader.firstName} ${row.organizerLeader.lastName}`.trim(),
          title: row.organizerLeader.title,
        }
      : null,
    locationId: row.locationId,
    location: canSeeLocation ? row.location : null,
    isOnline: row.isOnline,
    isHybrid: Boolean(row.isHybrid),
    meetingUrl: canSeeMeeting ? row.meetingUrl : null,
    locationVisibility: visibility,
    startAt: row.startAt.toISOString(),
    endAt: row.endAt.toISOString(),
    timezone: row.timezone,
    recurrence: row.recurrence,
    recurrenceInterval: row.recurrenceInterval,
    recurrenceUntil: iso(row.recurrenceUntil),
    recurrenceLabel: recurrenceLabel({
      recurrence: row.recurrence as 'none',
      recurrenceInterval: row.recurrenceInterval,
    }),
    featuredImageUrl: row.featuredImageUrl,
    featuredImageAlt: row.featuredImageAlt,
    registrationRequired: row.registrationRequired,
    registrationUrl: row.registrationUrl,
    capacity: row.capacity,
    allowOverVenueCapacity: Boolean(row.allowOverVenueCapacity),
    isWorshipService: Boolean(row.isWorshipService),
    serviceLabel: row.serviceLabel,
    registrationDeadline: iso(row.registrationDeadline),
    waitlistEnabled: Boolean(row.waitlistEnabled),
    allowGuestRegistration: Boolean(row.allowGuestRegistration),
    registrationAccess: row.registrationAccess || 'public',
    status: row.status,
    isFeatured: row.isFeatured,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    ogImageUrl: row.ogImageUrl,
    publishedAt: iso(row.publishedAt),
    publishAt: iso(row.publishAt),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    author: serializeAuthor(row.author),
    seo,
  };
}
