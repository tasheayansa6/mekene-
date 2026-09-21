import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CalendarDays, MapPin } from 'lucide-react';

import { PageHero } from '@/components/sections/PageHero';
import { Section } from '@/components/layout/Section';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LiveStreamPlayer } from '@/components/live/LiveStreamPlayer';
import { LiveProgramSidebar } from '@/components/live/LiveProgramSidebar';
import { LiveStatusBadge } from '@/components/live/LiveStatusBadge';
import { LiveChatPanel } from '@/components/live/LiveChatPanel';
import { LivePrayerForm } from '@/components/live/LivePrayerForm';
import { LiveAttendanceButton } from '@/components/live/LiveAttendanceButton';
import { LiveReactionsBar } from '@/components/live/LiveReactionsBar';
import { db } from '@/lib/db';
import { isEventPubliclyVisible } from '@/lib/events/status';
import { eventInclude, serializeEvent } from '@/lib/events/serialize';
import { getLiveBySlug } from '@/lib/live/public';
import { createPageMetadata } from '@/lib/seo';

export const revalidate = 30;

interface PageProps {
  params: Promise<{ slug: string }>;
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

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const now = new Date();
  const event = await db.event.findUnique({ where: { slug }, include: eventInclude });
  if (!event || !isEventPubliclyVisible(event, now)) {
    return { title: 'Service Not Found' };
  }
  return createPageMetadata({
    title: event.serviceLabel || event.title,
    description: event.shortDescription || `Worship service details for ${event.title}.`,
    path: `/services/${event.slug}`,
    image: event.featuredImageUrl || undefined,
  });
}

export default async function ServiceDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const now = new Date();

  const event = await db.event.findUnique({
    where: { slug },
    include: eventInclude,
  });

  if (!event || !isEventPubliclyVisible(event, now)) notFound();

  const serialized = serializeEvent(event, { isAuthenticated: false });

  const liveSession = await db.liveSession.findFirst({
    where: { eventId: event.id },
    orderBy: { scheduledStartAt: 'desc' },
    select: { slug: true },
  });

  const live = liveSession ? await getLiveBySlug(liveSession.slug, null) : null;
  const isLive = Boolean(live?.isLive);

  return (
    <div className="page-transition">
      <PageHero
        title={serialized.serviceLabel || serialized.title}
        subtitle={serialized.isWorshipService ? 'Worship Service' : 'Church Event'}
        description={serialized.shortDescription || undefined}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Services', href: '/services' },
          { label: serialized.title },
        ]}
      />

      <Section>
        <div className="mb-6 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <CalendarDays className="size-4" aria-hidden />
          <span>{formatEventDate(serialized.startAt, serialized.timezone)}</span>
          {serialized.location?.name ? (
            <>
              <span aria-hidden>·</span>
              <MapPin className="size-4" aria-hidden />
              <span>{serialized.location.name}</span>
            </>
          ) : null}
          {serialized.isOnline ? <Badge variant="secondary">Online</Badge> : null}
          {live ? <LiveStatusBadge status={live.displayStatus} pulse={isLive} /> : null}
        </div>

        {live ? (
          <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
            <div className="space-y-8">
              <LiveStreamPlayer
                embedUrl={live.embedUrl}
                backupEmbedUrl={live.backupEmbedUrl}
                title={live.title}
                status={live.displayStatus}
                scheduledStartAt={live.scheduledStartAt}
                recordingSlug={live.recording?.slug}
                recordingTitle={live.recording?.title}
                thumbnailUrl={live.thumbnailUrl}
              />
              <div className="space-y-4 rounded-lg border p-4">
                <LiveReactionsBar
                  slug={live.slug}
                  enabled={live.reactionsEnabled}
                  isLive={isLive}
                  initial={live.reactions}
                />
                <LiveAttendanceButton
                  slug={live.slug}
                  enabled={live.attendanceEnabled}
                  isLive={isLive}
                />
              </div>
              <LiveChatPanel slug={live.slug} enabled={live.chatEnabled} isLive={isLive} />
              <LivePrayerForm slug={live.slug} enabled={live.prayerEnabled} />
            </div>
            <LiveProgramSidebar
              title={live.program?.title}
              notes={live.program?.notes}
              items={live.program?.items || []}
              currentProgramItemId={live.currentProgramItemId}
              announcements={live.announcements?.map((item) => ({
                ...item,
                createdAt: item.createdAt.toISOString(),
              }))}
            />
          </div>
        ) : (
          <div className="mx-auto max-w-2xl space-y-4 text-center">
            <p className="text-muted-foreground">
              No live stream is linked to this service yet. Check back closer to the service time.
            </p>
            <Button asChild variant="outline">
              <Link href="/live">View live hub</Link>
            </Button>
          </div>
        )}

        {serialized.description ? (
          <div className="prose prose-neutral mx-auto mt-10 max-w-3xl dark:prose-invert">
            <p>{serialized.description}</p>
          </div>
        ) : null}
      </Section>
    </div>
  );
}
