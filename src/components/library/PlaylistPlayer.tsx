'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ChurchAudioPlayer } from '@/components/sermons/AudioPlayer';
import { VideoPlayer } from '@/components/sermons/VideoPlayer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type PlaylistItem = {
  id: string;
  sortOrder: number;
  href: string | null;
  sermon: {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    audioUrl: string | null;
    audioDownloadUrl: string | null;
    video: { embedUrl: string } | null;
  } | null;
  series: { id: string; name: string; slug: string } | null;
};

export function PlaylistPlayer({ items }: { items: PlaylistItem[] }) {
  const playable = items.filter((item) => item.sermon?.audioUrl || item.sermon?.video?.embedUrl);
  const [index, setIndex] = useState(0);
  const current = playable[index];

  if (playable.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">This playlist has no playable media items yet.</p>
    );
  }

  const sermon = current.sermon!;
  const hasPrev = index > 0;
  const hasNext = index < playable.length - 1;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{sermon.title}</CardTitle>
          <p className="text-sm text-muted-foreground">
            Item {index + 1} of {playable.length}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {sermon.video?.embedUrl ? (
            <VideoPlayer embedUrl={sermon.video.embedUrl} title={`${sermon.title} video`} />
          ) : null}
          {sermon.audioUrl ? (
            <ChurchAudioPlayer
              src={sermon.audioUrl}
              title={sermon.title}
              sermonSlug={sermon.slug}
              sermonId={sermon.id}
              showDownload={Boolean(sermon.audioDownloadUrl)}
              downloadHref={sermon.audioDownloadUrl || undefined}
            />
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!hasPrev}
              onClick={() => setIndex((value) => value - 1)}
              aria-label="Previous item"
            >
              <ChevronLeft className="mr-1 size-4" />
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!hasNext}
              onClick={() => setIndex((value) => value + 1)}
              aria-label="Next item"
            >
              Next
              <ChevronRight className="ml-1 size-4" />
            </Button>
            {current.href ? (
              <Button asChild variant="ghost" size="sm">
                <Link href={current.href}>Open sermon</Link>
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <ol className="space-y-2">
        {playable.map((item, itemIndex) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => setIndex(itemIndex)}
              className={`w-full rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                itemIndex === index
                  ? 'border-primary bg-primary/5 font-medium'
                  : 'hover:border-primary/30 hover:bg-muted/50'
              }`}
              aria-current={itemIndex === index ? 'true' : undefined}
            >
              {item.sermon?.title || item.series?.name || 'Untitled'}
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
