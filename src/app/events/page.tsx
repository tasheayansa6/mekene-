import type { Metadata } from 'next';
import Link from 'next/link';
import { CalendarDays } from 'lucide-react';

import { PageHero } from '@/components/sections/PageHero';
import { Section } from '@/components/layout/Section';
import { SectionHeading } from '@/components/sections/SectionHeading';
import { EventCard } from '@/components/cards/EventCard';
import { EventFilters } from '@/components/events/EventFilters';
import { EventCalendar } from '@/components/events/EventCalendar';
import { Button } from '@/components/ui/button';
import { getCalendarOccurrences, getPublicEventList, churchTimezone } from '@/lib/events/public';
import { monthGrid } from '@/lib/events/calendar';
import { createPageMetadata } from '@/lib/seo';

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  return createPageMetadata({
    title: 'Events & Calendar',
    description:
      'Upcoming church events at Busa Mekene Eyasus Church. Only events published by church administrators appear here.',
    path: '/events',
  });
}

function queryString(params: Record<string, string | undefined>, page?: number) {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) next.set(key, value);
  }
  if (page && page > 1) next.set('page', String(page));
  const qs = next.toString();
  return qs ? `/events?${qs}` : '/events';
}

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    search?: string;
    category?: string;
    ministry?: string;
    location?: string;
    online?: string;
    from?: string;
    to?: string;
    sort?: string;
    page?: string;
    view?: string;
    year?: string;
    month?: string;
  }>;
}) {
  const params = await searchParams;
  const q = params.q || params.search || '';
  const page = Number(params.page || 1);
  const sort = params.sort === 'latest' || params.sort === 'newest' ? params.sort : 'soonest';
  const view = params.view === 'month' ? 'month' : 'list';
  const timezone = await churchTimezone();
  const now = new Date();
  const year = Number(params.year) || now.getFullYear();
  const month = Number(params.month) || now.getMonth() + 1;
  const from = params.from ? `${params.from}T00:00:00.000Z` : undefined;
  const to = params.to ? `${params.to}T23:59:59.000Z` : undefined;
  const filtered = Boolean(q || params.category || params.ministry || params.location || params.online || params.from || params.to);
  const result = await getPublicEventList({
    q,
    category: params.category,
    ministry: params.ministry,
    location: params.location,
    online: params.online === 'true' ? true : params.online === 'false' ? false : undefined,
    from,
    to,
    sort,
    when: 'upcoming',
    page: Number.isNaN(page) ? 1 : page,
  });
  const totalPages = Math.max(1, Math.ceil(result.totalItems / result.pageSize));
  const query = {
    q,
    category: params.category,
    ministry: params.ministry,
    location: params.location,
    online: params.online,
    from: params.from,
    to: params.to,
    sort: sort === 'soonest' ? undefined : sort,
    view: view === 'list' ? undefined : view,
    year: view === 'month' ? String(year) : undefined,
    month: view === 'month' ? String(month) : undefined,
  };
  const weeks = monthGrid(year, month);
  const calendarFrom = new Date(`${weeks[0][0].date}T00:00:00.000Z`);
  const lastWeek = weeks[weeks.length - 1];
  const calendarTo = new Date(`${lastWeek[lastWeek.length - 1].date}T23:59:59.000Z`);
  const occurrences = view === 'month' ? await getCalendarOccurrences(calendarFrom, calendarTo) : [];

  return (
    <div className="page-transition">
      <PageHero
        title="Events"
        subtitle="Church Calendar"
        description="Published services, gatherings, and ministry activities. Drafts and unpublished items are not listed. Prefer the full calendar view for month browsing."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Events' },
        ]}
      />

      {result.featured && !filtered && view === 'list' ? (
        <Section variant="warm">
          <SectionHeading
            icon={CalendarDays}
            title="Featured event"
            align="left"
            className="mb-10"
          />
          <div className="mx-auto max-w-3xl">
            <EventCard
              title={result.featured.title}
              date={result.featured.startAt}
              endDate={result.featured.endAt}
              location={result.featured.location?.name}
              description={result.featured.shortDescription || undefined}
              isRecurring={result.featured.recurrence !== 'none'}
              href={`/events/${result.featured.slug}`}
              timeZone={result.featured.timezone}
              cancelled={result.featured.status === 'cancelled'}
              isOnline={result.featured.isOnline}
            />
          </div>
        </Section>
      ) : null}

      <Section>
        <div className="mb-4 flex flex-wrap gap-2">
          <Button asChild size="sm" variant={view === 'list' ? 'default' : 'outline'}>
            <Link href={queryString({ ...query, view: undefined, year: undefined, month: undefined })}>List</Link>
          </Button>
          <Button asChild size="sm" variant={view === 'month' ? 'default' : 'outline'}>
            <Link href={queryString({ ...query, view: 'month', year: String(year), month: String(month) })}>Month</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/calendar">Calendar</Link>
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link href="/events/past">Past events</Link>
          </Button>
        </div>
        <EventFilters
          search={q}
          category={params.category}
          ministry={params.ministry}
          location={params.location}
          online={params.online}
          from={params.from}
          to={params.to}
          sort={sort}
          categories={result.categories.map((item) => ({ label: item.name, value: item.slug }))}
          ministries={result.ministries.map((item) => ({ label: item.name, value: item.slug }))}
          locations={result.locations.map((item) => ({ label: item.name, value: item.slug }))}
        />
      </Section>

      {view === 'month' ? (
        <Section>
          <EventCalendar year={year} month={month} timezone={timezone} occurrences={occurrences} query={query} />
        </Section>
      ) : (
        <Section>
          <SectionHeading
            title="Upcoming events"
            description={
              result.totalItems
                ? `${result.totalItems} published event${result.totalItems === 1 ? '' : 's'}.`
                : undefined
            }
          />
          {result.events.length === 0 ? (
            <p className="mx-auto mt-8 max-w-2xl text-center text-muted-foreground">
              {filtered
                ? 'No events found. Try a different search or filter.'
                : 'No upcoming events at the moment. Please check back soon.'}
            </p>
          ) : (
            <div className="mx-auto mt-10 max-w-3xl space-y-4">
              {result.events.map((event) => (
                <EventCard
                  key={event.id}
                  title={event.title}
                  date={event.startAt}
                  endDate={event.endAt}
                  location={event.location?.name}
                  description={event.shortDescription || undefined}
                  isRecurring={event.recurrence !== 'none'}
                  href={`/events/${event.slug}`}
                  timeZone={event.timezone}
                  cancelled={event.status === 'cancelled'}
                  isOnline={event.isOnline}
                />
              ))}
            </div>
          )}
          {totalPages > 1 ? (
            <div className="mt-10 flex justify-center gap-3">
              {page > 1 ? (
                <Button asChild variant="outline">
                  <Link href={queryString(query, page - 1)}>Previous</Link>
                </Button>
              ) : null}
              {page < totalPages ? (
                <Button asChild variant="outline">
                  <Link href={queryString(query, page + 1)}>Next</Link>
                </Button>
              ) : null}
            </div>
          ) : null}
        </Section>
      )}
    </div>
  );
}
