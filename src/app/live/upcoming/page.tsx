import type { Metadata } from 'next';
import Link from 'next/link';
import { CalendarDays } from 'lucide-react';

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
import { getUpcomingLive } from '@/lib/live/public';
import { createPageMetadata } from '@/lib/seo';

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  return createPageMetadata({
    title: 'Upcoming Live Streams',
    description: 'Upcoming live worship streams at Busa Mekene Eyasus Church.',
    path: '/live/upcoming',
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

export default async function LiveUpcomingPage() {
  const upcoming = await getUpcomingLive(null, 50);

  return (
    <div className="page-transition">
      <PageHero
        title="Upcoming Live Streams"
        subtitle="Save the Date"
        description="Scheduled worship streams and special broadcasts."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Live', href: '/live' },
          { label: 'Upcoming' },
        ]}
      />

      <Section>
        <div className="mb-6">
          <Button asChild variant="outline" size="sm">
            <Link href="/live">Back to live hub</Link>
          </Button>
        </div>
        <SectionHeading
          icon={CalendarDays}
          title="Scheduled streams"
          description={
            upcoming.length
              ? `${upcoming.length} upcoming stream${upcoming.length === 1 ? '' : 's'}.`
              : undefined
          }
        />
        {upcoming.length === 0 ? (
          <p className="mx-auto mt-8 max-w-2xl text-center text-muted-foreground">
            No upcoming live streams scheduled. Please check back soon.
          </p>
        ) : (
          <div className="mx-auto mt-10 grid max-w-5xl gap-4 sm:grid-cols-2">
            {upcoming.map((session) => (
              <Card key={session.id}>
                <CardHeader>
                  <div className="mb-2">
                    <LiveStatusBadge status={session.displayStatus} />
                  </div>
                  <CardTitle className="text-lg">{session.title}</CardTitle>
                  <CardDescription>{formatDate(session.scheduledStartAt, session.timezone)}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {session.description ? (
                    <p className="text-sm text-muted-foreground line-clamp-3">{session.description}</p>
                  ) : null}
                  <LiveCountdown scheduledStartAt={session.scheduledStartAt} />
                  <Button asChild className="w-full">
                    <Link href={`/live/${session.slug}`}>View stream page</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
