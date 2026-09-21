'use client';

import { useState } from 'react';
import { VideoPlayer } from '@/components/sermons/VideoPlayer';

export function GalleryVideoList({
  videos,
}: {
  videos: Array<{
    id: string;
    title: string;
    description?: string | null;
    caption?: string | null;
    video?: { embedUrl: string; watchUrl: string } | null;
    sermon?: { title: string; href: string } | null;
  }>;
}) {
  if (!videos.length) return null;
  return (
    <div className="space-y-6">
      {videos.map((video) => (
        <GalleryVideoCard key={video.id} video={video} />
      ))}
    </div>
  );
}

function GalleryVideoCard({
  video,
}: {
  video: {
    title: string;
    description?: string | null;
    caption?: string | null;
    video?: { embedUrl: string; watchUrl: string } | null;
    sermon?: { title: string; href: string } | null;
  };
}) {
  const [load, setLoad] = useState(false);
  return (
    <article className="space-y-3 rounded-lg border p-4">
      <h3 className="text-lg font-semibold">{video.title}</h3>
      {video.caption || video.description ? (
        <p className="text-sm text-muted-foreground">{video.caption || video.description}</p>
      ) : null}
      {video.sermon ? (
        <p>
          This video is part of the sermon library.{' '}
          <a className="underline" href={video.sermon.href}>
            Watch {video.sermon.title}
          </a>
        </p>
      ) : null}
      {video.video ? (
        load ? (
          <VideoPlayer embedUrl={video.video.embedUrl} title={video.title} />
        ) : (
          <button
            type="button"
            className="flex aspect-video w-full items-center justify-center rounded-lg border bg-muted focus-ring"
            onClick={() => setLoad(true)}
          >
            Load video: {video.title}
          </button>
        )
      ) : null}
    </article>
  );
}
