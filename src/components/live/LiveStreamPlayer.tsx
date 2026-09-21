'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LiveCountdown } from '@/components/live/LiveCountdown';
import { LiveStatusBadge, type LiveDisplayStatus } from '@/components/live/LiveStatusBadge';
import { sanitizeEmbedUrl } from '@/lib/live/providers';
import { cn } from '@/lib/utils';

type PlayerStatus = 'loading' | 'offline' | 'live' | 'ended' | 'error';

function resolvePlayerStatus(
  status: LiveDisplayStatus | string,
  embedUrl: string | null | undefined
): PlayerStatus {
  if (status === 'ended' || status === 'cancelled' || status === 'failed') return 'ended';
  if (status === 'live' || status === 'paused') {
    return embedUrl ? 'live' : 'error';
  }
  if (status === 'scheduled' || status === 'starting_soon') return 'offline';
  return embedUrl ? 'live' : 'offline';
}

export function LiveStreamPlayer({
  embedUrl,
  backupEmbedUrl,
  title,
  status,
  scheduledStartAt,
  recordingSlug,
  recordingTitle,
  thumbnailUrl,
  className,
}: {
  embedUrl?: string | null;
  backupEmbedUrl?: string | null;
  title: string;
  status: LiveDisplayStatus | string;
  scheduledStartAt?: string;
  recordingSlug?: string | null;
  recordingTitle?: string | null;
  thumbnailUrl?: string | null;
  className?: string;
}) {
  const safeEmbed = useMemo(
    () => sanitizeEmbedUrl(embedUrl) || sanitizeEmbedUrl(backupEmbedUrl),
    [embedUrl, backupEmbedUrl]
  );
  const playerStatus = resolvePlayerStatus(status, safeEmbed);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [useBackup, setUseBackup] = useState(false);

  const activeEmbed = useMemo(() => {
    if (useBackup) return sanitizeEmbedUrl(backupEmbedUrl) || safeEmbed;
    return safeEmbed;
  }, [useBackup, backupEmbedUrl, safeEmbed]);

  if (playerStatus === 'ended') {
    return (
      <div
        className={cn(
          'flex aspect-video w-full flex-col items-center justify-center gap-4 rounded-lg border bg-muted/40 p-6 text-center',
          className
        )}
      >
        <LiveStatusBadge status="ended" />
        <p className="text-lg font-medium">This live stream has ended.</p>
        {recordingSlug ? (
          <Button asChild>
            <Link href={`/sermons/${recordingSlug}`}>
              Watch recording{recordingTitle ? `: ${recordingTitle}` : ''}
            </Link>
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">A recording will be posted when available.</p>
        )}
      </div>
    );
  }

  if (playerStatus === 'offline') {
    return (
      <div
        className={cn(
          'relative flex aspect-video w-full flex-col items-center justify-center gap-4 overflow-hidden rounded-lg border bg-muted/50 p-6 text-center',
          className
        )}
      >
        {thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnailUrl}
            alt=""
            className="absolute inset-0 size-full object-cover opacity-30"
          />
        ) : null}
        <div className="relative z-10 flex flex-col items-center gap-3">
          <LiveStatusBadge status={status} pulse={status === 'starting_soon'} />
          <p className="text-lg font-medium">{title}</p>
          <p className="text-sm text-muted-foreground">
            {status === 'starting_soon'
              ? 'The stream will begin shortly.'
              : 'This service has not started yet.'}
          </p>
          {scheduledStartAt ? (
            <LiveCountdown scheduledStartAt={scheduledStartAt} className="mt-2" />
          ) : null}
        </div>
      </div>
    );
  }

  if (playerStatus === 'error' || !activeEmbed) {
    return (
      <div
        role="alert"
        className={cn(
          'flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-6 text-center',
          className
        )}
      >
        <Radio className="size-8 text-destructive" aria-hidden />
        <p className="font-medium">Unable to load the live stream.</p>
        <p className="text-sm text-muted-foreground">
          The embed URL is missing or not from an approved provider.
        </p>
        {backupEmbedUrl && !useBackup ? (
          <Button type="button" variant="outline" size="sm" onClick={() => setUseBackup(true)}>
            Try backup stream
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cn('relative aspect-video w-full overflow-hidden rounded-lg border bg-black', className)}>
      {!iframeLoaded ? (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/20">
          <p className="text-sm text-muted-foreground" role="status">
            Loading stream…
          </p>
        </div>
      ) : null}
      <iframe
        src={activeEmbed}
        title={title}
        className="h-full w-full"
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        onLoad={() => setIframeLoaded(true)}
      />
      <div className="absolute left-3 top-3">
        <LiveStatusBadge status={status === 'paused' ? 'paused' : 'live'} pulse />
      </div>
    </div>
  );
}
