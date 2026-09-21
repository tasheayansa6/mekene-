import type { Metadata } from 'next';
import Link from 'next/link';
import { Radio, CalendarDays } from 'lucide-react';

import { PageHero } from '@/components/sections/PageHero';
import { Section } from '@/components/layout/Section';
import { SectionHeading } from '@/components/sections/SectionHeading';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { LiveCountdown } from '@/components/live/LiveCountdown';
import { LiveStatusBadge } from '@/components/live/LiveStatusBadge';
import { LiveStreamPlayer } from '@/components/live/LiveStreamPlayer';
import { getLiveNow, getUpcomingLive } from '@/lib/live/public';
import { createPageMetadata } from '@/lib/seo';

export const revalidate = 30;

export async function generateMetadata(): Promise<Metadata> {
  return createPageMetadata({
    title: 'Live Worship',
    description:
      'Watch live worship services and upcoming streams from Busa Mekene Eyasus Church.',
    path: '/live',
  });
}

function formatDate(iso: string, timezone?: string) {
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timezone || 'Africa/Addis_Ababa',
  });
}

export default async function LivePage() {
  const [liveNow, upcoming] = await Promise.all([getLiveNow(), getUpcomingLive(null, 12)]);

  return (
    <div className="page-transition">
      <PageHero
        title="Live Worship"
        subtitle="Watch With Us"
        description="Join our live worship services online. Upcoming streams are listed below."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Live' },
        ]}
      />

      {liveNow ? (
        <Section variant="warm">
          <SectionHeading icon={Radio} title="Live now" align="left" className="mb-8" />
          <div className="mx-auto max-w-4xl space-y-6">
            <LiveStreamPlayer
              embedUrl={liveNow.embedUrl}
              backupEmbedUrl={liveNow.backupEmbedUrl}
              title={liveNow.title}
              status={liveNow.displayStatus}
              scheduledStartAt={liveNow.scheduledStartAt}
              thumbnailUrl={liveNow.thumbnailUrl}
            />
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">{liveNow.title}</h2>
                {liveNow.description ? (
                  <p className="mt-1 text-muted-foreground">{liveNow.description}</p>
                ) : null}
              </div>
              <Button asChild size="lg">
                <Link href={`/live/${liveNow.slug}`}>Join live experience</Link>
              </Button>
            </div>
          </div>
        </Section>
      ) : null}

      <Section>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <SectionHeading
            icon={CalendarDays}
            title="Upcoming streams"
            align="left"
            description={
              upcoming.length
                ? `${upcoming.length} scheduled stream${upcoming.length === 1 ? '' : 's'}.`
                : 'No upcoming streams scheduled.'
            }
          />
          <Button asChild variant="outline" size="sm">
            <Link href="/live/upcoming">View all upcoming</Link>
          </Button>
        </div>

        {upcoming.length === 0 ? (
          <p className="text-center text-muted-foreground">
            No upcoming live streams at the moment. Please check back before the next service.
          </p>
        ) : (
          <div className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-2">
            {upcoming.map((session) => (
              <Card key={session.id} className="overflow-hidden">
                <CardHeader>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <LiveStatusBadge status={session.displayStatus} />
                  </div>
                  <CardTitle className="text-lg">{session.title}</CardTitle>
                  <CardDescription>{formatDate(session.scheduledStartAt, session.timezone)}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <LiveCountdown scheduledStartAt={session.scheduledStartAt} />
                  <Button asChild variant="outline" className="w-full">
                    <Link href={`/live/${session.slug}`}>View details</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </Section>

      <Section variant="muted">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-muted-foreground">
            Looking for weekly service times?{' '}
            <Link href="/services" className="font-medium text-primary underline-offset-4 hover:underline">
              View our services schedule
            </Link>
            .
          </p>
        </div>
      </Section>
    </div>
  );
}
