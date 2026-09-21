import type { Metadata } from 'next';
import Link from 'next/link';
import { Clock, Radio } from 'lucide-react';

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
import { Badge } from '@/components/ui/badge';
import { LiveStatusBadge } from '@/components/live/LiveStatusBadge';
import { churchConfig } from '@/config/church';
import { db } from '@/lib/db';
import { DAY_ORDER } from '@/app/api/v1/church/_lib/validation';
import { publicEventStatusWhere } from '@/lib/events/status';
import { eventInclude, serializeEvent } from '@/lib/events/serialize';
import { getLiveBadgeForEvent, getLiveNow } from '@/lib/live/public';
import { createPageMetadata } from '@/lib/seo';

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  return createPageMetadata({
    title: 'Services & Worship Times',
    description:
      'Weekly worship service schedule and upcoming online services at Busa Mekene Eyasus Church.',
    path: '/services',
  });
}

function formatScheduleTime(start: string, end: string | null) {
  if (!end) return start;
  return `${start} – ${end}`;
}

function formatEventDate(iso: string, timezone: string) {
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timezone,
  });
}

export default async function ServicesPage() {
  const now = new Date();
  const liveNow = await getLiveNow();

  const profile = await db.churchProfile.findFirst({
    where: { isActive: true, status: 'published' },
    select: { id: true },
  });

  const schedules = profile
    ? await db.serviceSchedule.findMany({
        where: { churchProfileId: profile.id, isActive: true },
        orderBy: [{ sortOrder: 'asc' }],
      })
    : [];

  const sortedSchedules = [...schedules].sort(
    (a, b) => (DAY_ORDER[a.dayOfWeek] ?? 99) - (DAY_ORDER[b.dayOfWeek] ?? 99)
  );

  const worshipEvents = await db.event.findMany({
    where: {
      AND: [
        publicEventStatusWhere(now),
        { isWorshipService: true },
        { endAt: { gte: now } },
        { status: { notIn: ['completed', 'archived', 'cancelled'] } },
      ],
    },
    include: eventInclude,
    orderBy: { startAt: 'asc' },
    take: 8,
  });

  const upcomingWorship = await Promise.all(
    worshipEvents.map(async (event) => ({
      ...serializeEvent(event, { isAuthenticated: false }),
      live: await getLiveBadgeForEvent(event.id, null),
    }))
  );

  const fallbackSchedules = churchConfig.serviceTimes;

  return (
    <div className="page-transition">
      <PageHero
        title="Services"
        subtitle="Worship With Us"
        description="Weekly service times and upcoming worship gatherings, including online streams."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Services' },
        ]}
      />

      {liveNow ? (
        <Section variant="warm">
          <div className="mx-auto flex max-w-3xl flex-col items-start gap-4 rounded-lg border border-destructive/20 bg-destructive/5 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <Radio className="mt-0.5 size-5 text-destructive" aria-hidden />
              <div>
                <LiveStatusBadge status={liveNow.displayStatus} pulse />
                <p className="mt-2 font-medium">{liveNow.title}</p>
                <p className="text-sm text-muted-foreground">Join the live worship experience now.</p>
              </div>
            </div>
            <Button asChild>
              <Link href={`/live/${liveNow.slug}`}>Watch live</Link>
            </Button>
          </div>
        </Section>
      ) : null}

      <Section>
        <SectionHeading icon={Clock} title="Weekly schedule" align="left" className="mb-8" />
        {sortedSchedules.length > 0 ? (
          <div className="mx-auto grid max-w-3xl gap-4">
            {sortedSchedules.map((item) => (
              <Card key={item.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{item.serviceName}</CardTitle>
                  <CardDescription>
                    {item.dayOfWeek} · {formatScheduleTime(item.startTime, item.endTime)}
                  </CardDescription>
                </CardHeader>
                {item.description || item.location ? (
                  <CardContent className="text-sm text-muted-foreground">
                    {item.description}
                    {item.location ? (
                      <p className="mt-1">{item.location}</p>
                    ) : null}
                  </CardContent>
                ) : null}
              </Card>
            ))}
          </div>
        ) : (
          <div className="mx-auto grid max-w-3xl gap-4">
            {fallbackSchedules.map((item) => (
              <Card key={`${item.day}-${item.name}`}>
                <CardHeader>
                  <CardTitle className="text-lg">{item.name}</CardTitle>
                  <CardDescription>
                    {item.day} · {item.time}
                  </CardDescription>
                </CardHeader>
                {item.description ? (
                  <CardContent className="text-sm text-muted-foreground">{item.description}</CardContent>
                ) : null}
              </Card>
            ))}
          </div>
        )}
      </Section>

      <Section variant="muted">
        <SectionHeading
          title="Upcoming worship services"
          description="Published worship events with online stream status when available."
          className="mb-8"
        />
        {upcomingWorship.length === 0 ? (
          <p className="text-center text-muted-foreground">No upcoming worship events listed.</p>
        ) : (
          <div className="mx-auto grid max-w-3xl gap-4">
            {upcomingWorship.map((event) => (
              <Card key={event.id}>
                <CardHeader>
                  <div className="mb-2 flex flex-wrap gap-2">
                    {event.isOnline ? <Badge variant="secondary">Online</Badge> : null}
                    {event.live?.isLive ? (
                      <LiveStatusBadge status="live" pulse />
                    ) : event.live ? (
                      <LiveStatusBadge status={event.live.displayStatus} />
                    ) : null}
                  </div>
                  <CardTitle className="text-lg">{event.title}</CardTitle>
                  <CardDescription>{formatEventDate(event.startAt, event.timezone)}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/services/${event.slug}`}>Service details</Link>
                  </Button>
                  {event.live?.isLive ? (
                    <Button asChild size="sm">
                      <Link href={`/live/${event.live.slug}`}>Watch live</Link>
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
