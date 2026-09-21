import type { Metadata } from 'next';
import Link from 'next/link';

import { PageHero } from '@/components/sections/PageHero';
import { Section } from '@/components/layout/Section';
import { EventCard } from '@/components/cards/EventCard';
import { EventFilters } from '@/components/events/EventFilters';
import { Button } from '@/components/ui/button';
import { getPublicEventList } from '@/lib/events/public';
import { createPageMetadata } from '@/lib/seo';

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  return createPageMetadata({
    title: 'Past Events',
    description: 'Historical published events from Busa Mekene Eyasus Church.',
    path: '/events/past',
  });
}

export default async function PastEventsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    category?: string;
    ministry?: string;
    location?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const page = Number(params.page || 1);
  const result = await getPublicEventList({
    q: params.q,
    category: params.category,
    ministry: params.ministry,
    location: params.location,
    when: 'past',
    sort: 'latest',
    page: Number.isNaN(page) ? 1 : page,
  });
  const totalPages = Math.max(1, Math.ceil(result.totalItems / result.pageSize));

  return (
    <div className="page-transition">
      <PageHero
        title="Past events"
        subtitle="Church History"
        description="Published events that have already taken place. Archived records are kept in the administration area."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Events', href: '/events' },
          { label: 'Past' },
        ]}
      />
      <Section>
        <EventFilters
          action="/events/past"
          search={params.q}
          category={params.category}
          ministry={params.ministry}
          location={params.location}
          sort="latest"
          categories={result.categories.map((item) => ({ label: item.name, value: item.slug }))}
          ministries={result.ministries.map((item) => ({ label: item.name, value: item.slug }))}
          locations={result.locations.map((item) => ({ label: item.name, value: item.slug }))}
        />
        {result.events.length === 0 ? (
          <p className="mx-auto mt-8 max-w-2xl text-center text-muted-foreground">
            {params.q ? 'No events found. Try a different search or filter.' : 'No past events are listed yet.'}
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
                <Link href={`/events/past?page=${page - 1}`}>Previous</Link>
              </Button>
            ) : null}
            {page < totalPages ? (
              <Button asChild variant="outline">
                <Link href={`/events/past?page=${page + 1}`}>Next</Link>
              </Button>
            ) : null}
          </div>
        ) : null}
      </Section>
    </div>
  );
}
