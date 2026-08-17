import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Calendar, MapPin, RefreshCw, ArrowLeft, Share2 } from 'lucide-react';

import { PageHero } from '@/components/sections/PageHero';
import { Section } from '@/components/layout/Section';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { eventsData, pastEventsData, getEventBySlug } from '@/data/events';
import { createPageMetadata } from '@/lib/seo';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return [...eventsData, ...pastEventsData].map((event) => ({
    slug: event.slug,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = getEventBySlug(slug);
  if (!event) {
    return { title: 'Event Not Found | Busa Mekenene Eyasus Church' };
  }
  return createPageMetadata({
    title: `${event.title} | Busa Mekenene Eyasus Church`,
    description: event.description,
    path: `/events/${event.slug}`,
  });
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default async function EventDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const event = getEventBySlug(slug);
  if (!event) {
    notFound();
  }

  const endDateFormatted = event.endDate
    ? formatDate(event.endDate)
    : null;
  const startDateFormatted = formatDate(event.date);

  return (
    <div className="page-transition">
      <PageHero
        title={event.title}
        subtitle="Event"
        description={event.description}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Events', href: '/events' },
          { label: event.title },
        ]}
      />

      {/* Event Details */}
      <Section>
        <div className="mx-auto max-w-3xl">
          {/* Back link */}
          <Button variant="ghost" asChild className="mb-8 -ml-2">
            <Link href="/events">
              <ArrowLeft className="mr-2 size-4" />
              Back to Events
            </Link>
          </Button>

          {/* Info card */}
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-3">
                <CardTitle className="text-2xl">{event.title}</CardTitle>
                {event.isRecurring && (
                  <Badge variant="secondary" className="gap-1">
                    <RefreshCw className="h-3 w-3" />
                    Recurring
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Date & Time */}
              <div className="flex items-start gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Calendar className="size-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Date
                  </p>
                  <p className="font-semibold">
                    {startDateFormatted}
                    {endDateFormatted && (
                      <span className="text-muted-foreground">
                        {' '}&ndash; {endDateFormatted}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Location */}
              {event.location && (
                <>
                  <div className="flex items-start gap-4">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <MapPin className="size-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Location
                      </p>
                      <p className="font-semibold">{event.location}</p>
                      {/* [PLACEHOLDER] Replace with actual address when available */}
                    </div>
                  </div>
                  <Separator />
                </>
              )}

              {/* Full Description */}
              <div>
                <h3 className="mb-3 text-lg font-semibold text-primary">
                  About This Event
                </h3>
                <p className="leading-relaxed text-muted-foreground">
                  {event.fullDescription || event.description}
                </p>
                {/* [PLACEHOLDER] Full event details to be added when available */}
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-3 pt-2">
                <Button asChild className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
                  <Link href="/contact">Contact Us for Details</Link>
                </Button>
                <Button variant="outline">
                  <Share2 className="mr-2 size-4" />
                  Share Event
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Section>
    </div>
  );
}
