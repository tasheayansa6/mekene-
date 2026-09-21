import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { PageHero } from '@/components/sections/PageHero';
import { Section } from '@/components/layout/Section';
import { LiveStreamPlayer } from '@/components/live/LiveStreamPlayer';
import { LiveProgramSidebar } from '@/components/live/LiveProgramSidebar';
import { LiveChatPanel } from '@/components/live/LiveChatPanel';
import { LivePrayerForm } from '@/components/live/LivePrayerForm';
import { LiveAttendanceButton } from '@/components/live/LiveAttendanceButton';
import { LiveReactionsBar } from '@/components/live/LiveReactionsBar';
import { LiveStatusBadge } from '@/components/live/LiveStatusBadge';
import { getLiveBySlug } from '@/lib/live/public';
import { createPageMetadata } from '@/lib/seo';

export const revalidate = 15;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const session = await getLiveBySlug(slug);
  if (!session) return { title: 'Live Stream Not Found' };
  return createPageMetadata({
    title: session.title,
    description: session.description || `Watch ${session.title} live from Busa Mekene Eyasus Church.`,
    path: `/live/${session.slug}`,
    image: session.thumbnailUrl || undefined,
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

export default async function LiveDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const session = await getLiveBySlug(slug);
  if (!session) notFound();

  const isLive = session.isLive;
  const isEnded = session.displayStatus === 'ended';

  return (
    <div className="page-transition">
      <PageHero
        title={session.title}
        subtitle={isLive ? 'Live now' : isEnded ? 'Stream ended' : 'Upcoming stream'}
        description={session.description || undefined}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Live', href: '/live' },
          { label: session.title },
        ]}
      />

      <Section>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <LiveStatusBadge status={session.displayStatus} pulse={isLive} />
          <span className="text-sm text-muted-foreground">
            {formatDate(session.scheduledStartAt, session.timezone)}
          </span>
          {session.approximateViewers && isLive ? (
            <span className="text-sm text-muted-foreground">
              · ~{session.approximateViewers} watching
            </span>
          ) : null}
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <div className="space-y-8">
            <LiveStreamPlayer
              embedUrl={session.embedUrl}
              backupEmbedUrl={session.backupEmbedUrl}
              title={session.title}
              status={session.displayStatus}
              scheduledStartAt={session.scheduledStartAt}
              recordingSlug={session.recording?.slug}
              recordingTitle={session.recording?.title}
              thumbnailUrl={session.thumbnailUrl}
            />

            <div className="space-y-4 rounded-lg border p-4">
              <h2 className="text-lg font-semibold">Participate</h2>
              <LiveReactionsBar
                slug={session.slug}
                enabled={session.reactionsEnabled}
                isLive={isLive}
                initial={session.reactions}
              />
              <LiveAttendanceButton
                slug={session.slug}
                enabled={session.attendanceEnabled}
                isLive={isLive}
              />
            </div>

            <LiveChatPanel slug={session.slug} enabled={session.chatEnabled} isLive={isLive} />
            <LivePrayerForm slug={session.slug} enabled={session.prayerEnabled} />
          </div>

          <LiveProgramSidebar
            title={session.program?.title}
            notes={session.program?.notes}
            items={session.program?.items || []}
            currentProgramItemId={session.currentProgramItemId}
            announcements={session.announcements?.map((item) => ({
              ...item,
              createdAt: item.createdAt.toISOString(),
            }))}
          />
        </div>
      </Section>
    </div>
  );
}
