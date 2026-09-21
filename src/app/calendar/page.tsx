import type { Metadata } from 'next';
import Link from 'next/link';

import { PageHero } from '@/components/sections/PageHero';
import { Section } from '@/components/layout/Section';
import { EventCalendar } from '@/components/events/EventCalendar';
import { EventCard } from '@/components/cards/EventCard';
import { Button } from '@/components/ui/button';
import { getCalendarOccurrences, getPublicEventList, churchTimezone } from '@/lib/events/public';
import { monthGrid } from '@/lib/events/calendar';
import { createPageMetadata } from '@/lib/seo';

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  return createPageMetadata({
    title: 'Church Calendar',
    description:
      'Month and list views of published church events at Busa Mekene Eyasus Church.',
    path: '/calendar',
  });
}

function queryString(params: Record<string, string | undefined>, page?: number) {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) next.set(key, value);
  }
  if (page && page > 1) next.set('page', String(page));
  const qs = next.toString();
  return qs ? `/calendar?${qs}` : '/calendar';
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{
    view?: string;
    year?: string;
    month?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const view = params.view === 'list' ? 'list' : 'month';
  const timezone = await churchTimezone();
  const now = new Date();
  const year = Number(params.year) || now.getFullYear();
  const month = Number(params.month) || now.getMonth() + 1;
  const page = Number(params.page || 1);
  const query = {
    view: view === 'month' ? undefined : view,
    year: view === 'month' ? String(year) : undefined,
    month: view === 'month' ? String(month) : undefined,
  };

  const weeks = monthGrid(year, month);
  const calendarFrom = new Date(`${weeks[0][0].date}T00:00:00.000Z`);
  const lastWeek = weeks[weeks.length - 1];
  const calendarTo = new Date(`${lastWeek[lastWeek.length - 1].date}T23:59:59.000Z`);
  const occurrences = view === 'month' ? await getCalendarOccurrences(calendarFrom, calendarTo) : [];
  const list =
    view === 'list'
      ? await getPublicEventList({
          when: 'upcoming',
          sort: 'soonest',
          page: Number.isNaN(page) ? 1 : page,
        })
      : null;
  const totalPages = list ? Math.max(1, Math.ceil(list.totalItems / list.pageSize)) : 1;

  return (
    <div className="page-transition">
      <PageHero
        title="Calendar"
        subtitle="Church events"
        description="Browse published services and gatherings by month or as a list."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Calendar' },
        ]}
      />

      <Section>
        <div className="mb-6 flex flex-wrap gap-2">
          <Button asChild size="sm" variant={view === 'month' ? 'default' : 'outline'}>
            <Link href={queryString({ view: undefined, year: String(year), month: String(month) })}>
              Month
            </Link>
          </Button>
          <Button asChild size="sm" variant={view === 'list' ? 'default' : 'outline'}>
            <Link href={queryString({ view: 'list', year: undefined, month: undefined })}>List</Link>
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link href="/events">All events</Link>
          </Button>
        </div>

        {view === 'month' ? (
          <EventCalendar
            year={year}
            month={month}
            timezone={timezone}
            occurrences={occurrences}
            query={query}
            basePath="/calendar"
          />
        ) : list ? (
          <>
            {list.events.length === 0 ? (
              <p className="mx-auto max-w-2xl text-center text-muted-foreground">
                No upcoming events at the moment. Please check back soon.
              </p>
            ) : (
              <div className="mx-auto max-w-3xl space-y-4">
                {list.events.map((event) => (
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
                    <Link href={queryString({ view: 'list' }, page - 1)}>Previous</Link>
                  </Button>
                ) : null}
                {page < totalPages ? (
                  <Button asChild variant="outline">
                    <Link href={queryString({ view: 'list' }, page + 1)}>Next</Link>
                  </Button>
                ) : null}
              </div>
            ) : null}
          </>
        ) : null}
      </Section>
    </div>
  );
}
