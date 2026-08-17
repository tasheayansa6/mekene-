import type { Metadata } from 'next';
import Link from 'next/link';
import { Calendar, Mail, Phone, ArrowRight } from 'lucide-react';

import { PageHero } from '@/components/sections/PageHero';
import { Section } from '@/components/layout/Section';
import { SectionHeading } from '@/components/sections/SectionHeading';
import { EventCard } from '@/components/cards/EventCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { eventsData, pastEventsData } from '@/data/events';
import { churchConfig } from '@/config/church';

export const metadata: Metadata = {
  title: 'Events | Busa Mekenene Eyasus Church',
  description:
    'Upcoming events, services, and activities at Busa Mekenene Eyasus Church. Join us for worship, fellowship, and spiritual growth.',
};

export default function EventsPage() {
  return (
    <div className="page-transition">
      <PageHero
        title="Events"
        subtitle="Our Church Life"
        description="Discover upcoming services, fellowship gatherings, feast day celebrations, and community outreach opportunities at Busa Mekenene Eyasus Church."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Events' },
        ]}
      />

      {/* Intro */}
      <Section>
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-lg leading-relaxed text-muted-foreground">
            Our church community is alive with worship, learning, and service.
            Browse our upcoming events below and plan to join us. All are
            welcome!
          </p>
        </div>
      </Section>

      {/* Upcoming Events */}
      <Section>
        <SectionHeading
          icon={Calendar}
          title="Upcoming Events"
          description="Mark your calendar and join us for these upcoming gatherings."
        />

        <div className="mx-auto mt-10 max-w-3xl space-y-4">
          {eventsData.map((event) => (
            <Link key={event.slug} href={`/events/${event.slug}`}>
              <EventCard
                title={event.title}
                date={event.date}
                endDate={event.endDate}
                location={event.location}
                description={event.description}
                isRecurring={event.isRecurring}
              />
            </Link>
          ))}
        </div>
      </Section>

      {/* Past Events */}
      <Section variant="muted">
        <SectionHeading
          title="Past Events"
          description="A look back at recent celebrations and gatherings."
        />

        <div className="mx-auto mt-10 max-w-3xl space-y-4">
          {pastEventsData.map((event) => (
            <EventCard
              key={event.slug}
              title={event.title}
              date={event.date}
              location={event.location}
              description={event.description}
            />
          ))}
        </div>
      </Section>

      {/* Contact CTA */}
      <Section variant="primary">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-primary-foreground md:text-4xl">
            Have Questions About an Event?
          </h2>
          <div className="gold-accent-line mx-auto mt-4 w-24" />
          <p className="mx-auto mt-6 max-w-xl text-lg text-primary-foreground/80">
            Whether you need more details about an upcoming event or would like
            to volunteer, we would love to hear from you. Reach out to us today.
          </p>

          <Card className="mx-auto mt-8 max-w-md bg-primary-foreground/10 backdrop-blur">
            <CardContent className="p-6">
              <div className="space-y-3 text-left text-primary-foreground/90">
                <div className="flex items-center gap-3">
                  <Mail className="size-5 shrink-0" />
                  <span>{churchConfig.contact.email}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="size-5 shrink-0" />
                  <span>{churchConfig.contact.phone}</span>
                </div>
              </div>
              <Button
                asChild
                size="lg"
                className="mt-6 w-full"
                variant="secondary"
              >
                <Link href="/contact">
                  Contact Us
                  <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </Section>
    </div>
  );
}
