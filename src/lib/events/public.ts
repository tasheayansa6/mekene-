import { db } from '@/lib/db';
import { promoteScheduledContent, seoDefaults } from '@/lib/content/query';
import { eventInclude, organizerLabel, serializeEvent } from './serialize';
import { isEventPubliclyVisible, publicEventStatusWhere } from './status';
import { expandOccurrences } from './recurrence';
import { DEFAULT_EVENT_TIMEZONE } from './timezone';
import { getSystemSettings } from '@/lib/admin/settings';

export { organizerLabel };

export async function churchTimezone() {
  const settings = await getSystemSettings();
  return settings.timezone || DEFAULT_EVENT_TIMEZONE;
}

export async function getPublicEventList(options: {
  q?: string;
  category?: string;
  ministry?: string;
  location?: string;
  online?: boolean;
  featured?: boolean;
  when?: 'upcoming' | 'past' | 'all';
  from?: string;
  to?: string;
  sort?: 'soonest' | 'latest' | 'newest';
  page?: number;
  pageSize?: number;
}) {
  await promoteScheduledContent();
  const now = new Date();
  const page = options.page || 1;
  const pageSize = options.pageSize || 12;
  const when = options.when || 'upcoming';
  const where: Record<string, unknown> = { AND: [publicEventStatusWhere(now)] };
  const and = where.AND as object[];
  const q = options.q?.trim();
  if (q) {
    and.push({
      OR: [
        { title: { contains: q } },
        { description: { contains: q } },
        { shortDescription: { contains: q } },
        { organizerName: { contains: q } },
        { ministry: { name: { contains: q } } },
        { organizerLeader: { OR: [{ firstName: { contains: q } }, { lastName: { contains: q } }] } },
        { location: { OR: [{ name: { contains: q } }, { address: { contains: q } }] } },
      ],
    });
  }
  if (options.category) {
    and.push({ OR: [{ categoryId: options.category }, { category: { slug: options.category } }] });
  }
  if (options.ministry) {
    and.push({ OR: [{ ministryId: options.ministry }, { ministry: { slug: options.ministry } }] });
  }
  if (options.location) {
    and.push({ OR: [{ locationId: options.location }, { location: { slug: options.location } }] });
  }
  if (options.online === true) and.push({ isOnline: true });
  if (options.online === false) and.push({ isOnline: false });
  if (options.featured) and.push({ isFeatured: true });
  if (options.from) {
    const fromDate = new Date(options.from);
    if (!Number.isNaN(fromDate.getTime())) and.push({ endAt: { gte: fromDate } });
  }
  if (options.to) {
    const toDate = new Date(options.to);
    if (!Number.isNaN(toDate.getTime())) and.push({ startAt: { lte: toDate } });
  }
  if (when === 'upcoming') {
    and.push({ endAt: { gte: now } });
    and.push({ status: { notIn: ['completed', 'archived'] } });
  } else if (when === 'past') {
    and.push({ endAt: { lt: now } });
  }

  const orderBy =
    options.sort === 'newest'
      ? { publishedAt: 'desc' as const }
      : options.sort === 'latest'
        ? { startAt: 'desc' as const }
        : { startAt: 'asc' as const };

  const featuredWhere = {
    AND: [
      publicEventStatusWhere(now),
      { isFeatured: true },
      { endAt: { gte: now } },
      { status: { notIn: ['completed', 'cancelled', 'archived'] } },
    ],
  };

  const [totalItems, rows, featured, categories, locations, ministries] = await Promise.all([
    db.event.count({ where }),
    db.event.findMany({
      where,
      include: eventInclude,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.event.findFirst({
      where: featuredWhere,
      include: eventInclude,
      orderBy: { startAt: 'asc' },
    }),
    db.eventCategory.findMany({ orderBy: { sortOrder: 'asc' }, select: { name: true, slug: true } }),
    db.eventLocation.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { name: true, slug: true },
    }),
    db.ministry.findMany({
      where: { events: { some: publicEventStatusWhere(now) } },
      orderBy: { name: 'asc' },
      select: { name: true, slug: true },
    }),
  ]);

  return {
    totalItems,
    page,
    pageSize,
    categories,
    locations,
    ministries,
    timezone: await churchTimezone(),
    featured: featured && isEventPubliclyVisible(featured) ? serializeEvent(featured, { includeMeetingUrl: false }) : null,
    events: rows.map((row) => serializeEvent(row, { includeMeetingUrl: false })),
  };
}

export async function getPublicEventBySlug(slug: string) {
  await promoteScheduledContent();
  const event = await db.event.findUnique({ where: { slug }, include: eventInclude });
  if (!event || !isEventPubliclyVisible(event)) return null;
  const relatedFilter = [
    event.categoryId ? { categoryId: event.categoryId } : null,
    event.ministryId ? { ministryId: event.ministryId } : null,
  ].filter(Boolean) as object[];
  const related = await db.event.findMany({
    where: {
      AND: [
        publicEventStatusWhere(),
        { id: { not: event.id } },
        { endAt: { gte: new Date() } },
        { status: { notIn: ['cancelled', 'archived'] } },
        ...(relatedFilter.length ? [{ OR: relatedFilter }] : []),
      ],
    },
    take: 3,
    orderBy: { startAt: 'asc' },
    include: eventInclude,
  });
  const program = await db.serviceProgram.findUnique({
    where: { eventId: event.id },
    include: { items: { orderBy: { sortOrder: 'asc' } } },
  });
  const publicProgram =
    program && program.isPublic
      ? {
          title: program.title,
          items: program.items.map((item) => ({
            title: item.title,
            itemType: item.itemType,
            durationMinutes: item.durationMinutes,
            responsibleLabel: item.responsibleLabel,
          })),
        }
      : null;
  return {
    event: serializeEvent(event),
    program: publicProgram,
    related: related.map((item) => serializeEvent(item, { includeMeetingUrl: false })),
    seo: seoDefaults({
      title: event.title,
      excerpt: event.shortDescription || event.description,
      seoTitle: event.seoTitle,
      seoDescription: event.seoDescription,
      featuredImageUrl: event.featuredImageUrl,
      ogImageUrl: event.ogImageUrl,
    }),
  };
}

export async function getCalendarOccurrences(from: Date, to: Date) {
  await promoteScheduledContent();
  const now = new Date();
  const maxMs = 93 * 24 * 60 * 60 * 1000;
  let rangeStart = from;
  let rangeEnd = to;
  if (rangeEnd < rangeStart) {
    const swap = rangeStart;
    rangeStart = rangeEnd;
    rangeEnd = swap;
  }
  if (rangeEnd.getTime() - rangeStart.getTime() > maxMs) {
    rangeEnd = new Date(rangeStart.getTime() + maxMs);
  }
  const rows = await db.event.findMany({
    where: {
      AND: [
        publicEventStatusWhere(now),
        { startAt: { lte: rangeEnd } },
        {
          OR: [
            { recurrence: 'none', endAt: { gte: rangeStart } },
            { recurrence: { not: 'none' }, OR: [{ recurrenceUntil: null }, { recurrenceUntil: { gte: rangeStart } }] },
          ],
        },
      ],
    },
    include: eventInclude,
    orderBy: { startAt: 'asc' },
    take: 200,
  });
  return rows.flatMap((row) => {
    if (!isEventPubliclyVisible(row, now)) return [];
    const occurrences = expandOccurrences(
      {
        startAt: row.startAt,
        endAt: row.endAt,
        recurrence: row.recurrence as 'none',
        recurrenceInterval: row.recurrenceInterval,
        recurrenceUntil: row.recurrenceUntil,
      },
      rangeStart,
      rangeEnd
    );
    return occurrences.map((occurrence) => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      status: row.status,
      timezone: row.timezone,
      href: `/events/${row.slug}`,
      startAt: occurrence.startAt.toISOString(),
      endAt: occurrence.endAt.toISOString(),
      isOnline: row.isOnline,
      locationName: row.location?.name || null,
    }));
  });
}

export async function getHomeEvents(limit = 4) {
  await promoteScheduledContent();
  const now = new Date();
  const rows = await db.event.findMany({
    where: {
      AND: [publicEventStatusWhere(now), { endAt: { gte: now } }, { status: { notIn: ['completed', 'archived', 'cancelled'] } }],
    },
    include: eventInclude,
    orderBy: { startAt: 'asc' },
    take: limit,
  });
  return rows.map((row) => serializeEvent(row, { includeMeetingUrl: false }));
}

export async function getPublishedEventUrls() {
  await promoteScheduledContent();
  return db.event.findMany({
    where: publicEventStatusWhere(),
    select: { slug: true, updatedAt: true },
  });
}
