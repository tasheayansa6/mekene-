import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Calendar, MapPin, Users } from 'lucide-react';

import { PageHero } from '@/components/sections/PageHero';
import { Section } from '@/components/layout/Section';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MarkdownContent } from '@/components/content/MarkdownContent';
import { EventCard } from '@/components/cards/EventCard';
import { getPublicEventBySlug } from '@/lib/events/public';
import { getPublishedAlbumsForEvent } from '@/lib/gallery/public';
import { createPageMetadata } from '@/lib/seo';
import { eventJsonLd } from '@/lib/events/ics';
import { formatInTimeZone } from '@/lib/events/timezone';
import { RESERVED_EVENT_SLUGS } from '@/lib/events/access';
import { RelatedGallery } from '@/components/gallery/RelatedGallery';

export const revalidate = 60;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  if (RESERVED_EVENT_SLUGS.has(slug)) return { title: 'Event Not Found' };
  const result = await getPublicEventBySlug(slug);
  if (!result) return { title: 'Event Not Found' };
  return createPageMetadata({
    title: result.seo.seoTitle,
    description: result.seo.seoDescription,
    path: `/events/${result.event.slug}`,
    image: result.seo.ogImage || undefined,
  });
}

export default async function EventDetailPage({ params }: PageProps) {
  const { slug } = await params;
  if (RESERVED_EVENT_SLUGS.has(slug)) notFound();
  const result = await getPublicEventBySlug(slug);
  if (!result) notFound();
  const { event, related, program } = result;
  const galleries = await getPublishedAlbumsForEvent(event.id);
  const pageUrl = `https://busamekeneeyasus.org/events/${event.slug}`;
  const cancelled = event.status === 'cancelled';
  const startLabel = formatInTimeZone(event.startAt, event.timezone, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
  const endLabel = formatInTimeZone(event.endAt, event.timezone, {
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
  const jsonLd = eventJsonLd({
    title: event.title,
    description: event.shortDescription || event.description,
    url: pageUrl,
    startAt: event.startAt,
    endAt: event.endAt,
    image: event.featuredImageUrl,
    locationName: event.location?.name,
    locationAddress: event.location?.address,
    isOnline: event.isOnline,
    cancelled,
    organizerName: event.organizerName || event.ministry?.name,
  });

  return (
    <div className="page-transition">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PageHero
        title={event.title}
        subtitle={cancelled ? 'Cancelled event' : event.category?.name || 'Event'}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Events', href: '/events' },
          { label: event.title },
        ]}
      />

      <Section>
        <div className="grid gap-10 lg:grid-cols-[2fr_1fr]">
          <article>
            {cancelled ? (
              <p
                className="mb-6 rounded-md border border-destructive px-4 py-3 text-sm font-semibold uppercase tracking-wide"
                role="status"
              >
                Cancelled
              </p>
            ) : null}
            <div className="mb-6 flex flex-wrap items-center gap-3">
              {event.category ? (
                <Badge asChild variant="secondary">
                  <Link href={`/events?category=${event.category.slug}`}>{event.category.name}</Link>
                </Badge>
              ) : null}
              <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                <Calendar className="size-3.5" aria-hidden />
                <time dateTime={event.startAt}>{startLabel}</time>
                <span aria-hidden> – </span>
                <time dateTime={event.endAt}>{endLabel}</time>
              </span>
            </div>

            {event.featuredImageUrl ? (
              <div className="relative mb-8 aspect-[16/9] w-full overflow-hidden rounded-xl">
                <Image
                  src={event.featuredImageUrl}
                  alt={event.featuredImageAlt || event.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 66vw"
                  priority
                />
              </div>
            ) : null}

            {event.description ? <MarkdownContent content={event.description} /> : null}

            {program?.items?.length ? (
              <section className="mt-8 rounded-xl border p-6" aria-labelledby="event-program-heading">
                <h2 id="event-program-heading" className="mb-4 text-lg font-semibold">
                  {program.title || 'Program'}
                </h2>
                <ol className="space-y-2 text-sm">
                  {program.items.map((item, index) => (
                    <li key={`${item.title}-${index}`} className="flex flex-wrap gap-2">
                      <span className="font-medium">
                        {index + 1}. {item.title}
                      </span>
                      {item.responsibleLabel ? (
                        <span className="text-muted-foreground">— {item.responsibleLabel}</span>
                      ) : null}
                    </li>
                  ))}
                </ol>
              </section>
            ) : null}

            {event.ministry ? (
              <p className="mt-8 text-sm">
                Organized by{' '}
                <Link className="text-primary underline-offset-4 hover:underline" href={`/ministries/${event.ministry.slug}`}>
                  {event.ministry.name}
                </Link>
              </p>
            ) : null}

            {event.organizer ? (
              <p className="mt-2 text-sm">
                Organizer:{' '}
                <Link className="text-primary underline-offset-4 hover:underline" href="/about/leadership">
                  {event.organizer.name}
                </Link>
                {event.organizer.title ? ` · ${event.organizer.title}` : null}
              </p>
            ) : event.organizerName ? (
              <p className="mt-2 text-sm">Organizer: {event.organizerName}</p>
            ) : null}

            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild>
                <a href={`/api/v1/events/${event.slug}/ics`}>Add to calendar (.ics)</a>
              </Button>
              <Button asChild variant="outline">
                <a href={`/api/v1/events/${event.slug}/ics?format=google`} rel="noreferrer">
                  Google Calendar
                </a>
              </Button>
              <Button asChild variant="ghost">
                <Link href="/events">
                  <ArrowLeft className="mr-2 size-4" />
                  All events
                </Link>
              </Button>
            </div>
          </article>

          <aside className="space-y-4">
            {event.location ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MapPin className="size-4" />
                    Location
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>{event.location.name}</p>
                  {event.location.address ? <p className="text-muted-foreground">{event.location.address}</p> : null}
                  {event.location.mapUrl ? (
                    <Button asChild variant="outline" size="sm">
                      <a href={event.location.mapUrl} rel="noreferrer">
                        Open map
                      </a>
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            ) : null}

            {event.isOnline ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Online event</CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  {event.meetingUrl ? (
                    <Button asChild>
                      <a href={event.meetingUrl} rel="noreferrer">
                        Join meeting
                      </a>
                    </Button>
                  ) : (
                    <p className="text-muted-foreground">
                      {event.locationVisibility === 'private'
                        ? 'Meeting details are private and shared with confirmed registrants.'
                        : 'Meeting details will be shared by the church.'}
                    </p>
                  )}
                </CardContent>
              </Card>
            ) : null}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="size-4" />
                  Registration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {cancelled ? (
                  <p>This event has been cancelled. New registrations are closed.</p>
                ) : event.registrationRequired ? (
                  <>
                    <p>Registration is required.</p>
                    {event.capacity ? <p>Capacity: {event.capacity}</p> : null}
                    {event.registrationDeadline ? (
                      <p>
                        Deadline:{' '}
                        {formatInTimeZone(event.registrationDeadline, event.timezone, {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </p>
                    ) : null}
                    <Button asChild>
                      <Link href={`/events/${event.slug}/register`}>Register</Link>
                    </Button>
                    {event.registrationUrl ? (
                      <Button asChild variant="outline" size="sm">
                        <a href={event.registrationUrl} rel="noreferrer">
                          External registration
                        </a>
                      </Button>
                    ) : null}
                  </>
                ) : (
                  <p>Registration is not required.</p>
                )}
              </CardContent>
            </Card>
          </aside>
        </div>
      </Section>

      {galleries.length ? (
        <Section>
          <RelatedGallery title="Event Gallery" albums={galleries as never} />
        </Section>
      ) : null}

      {related.length > 0 ? (
        <Section variant="warm">
          <h2 className="mb-6 text-2xl font-semibold text-primary">Related events</h2>
          <div className="mx-auto max-w-3xl space-y-4">
            {related.map((item) => (
              <EventCard
                key={item.id}
                title={item.title}
                date={item.startAt}
                location={item.location?.name}
                href={`/events/${item.slug}`}
                timeZone={item.timezone}
                cancelled={item.status === 'cancelled'}
                isOnline={item.isOnline}
              />
            ))}
          </div>
        </Section>
      ) : null}
    </div>
  );
}
