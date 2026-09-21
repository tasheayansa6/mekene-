'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api/client';
import { PermissionGate } from '@/components/admin/PermissionGate';
import { PageHeader } from '@/components/admin/PageHeader';
import { MarkdownContent } from '@/components/content/MarkdownContent';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ApiErrorAlert } from '@/components/admin/ApiErrorAlert';
import { AudioPlayer } from '@/components/sermons/AudioPlayer';
import { VideoPlayer } from '@/components/sermons/VideoPlayer';

export function SermonPreview({ id }: { id: string }) {
  const [item, setItem] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void apiGet<Record<string, unknown>>(`/admin/sermons/${id}`).then((result) => {
      if (!result.success || !result.data) {
        setError(result.message || 'Unable to load preview.');
        return;
      }
      setItem(result.data);
    });
  }, [id]);

  const title = String(item?.title || 'Preview');
  const description = String(item?.description || '');
  const notes = String(item?.notes || '');
  const transcript = String(item?.transcript || '');
  const image = String(item?.thumbnailUrl || '');
  const audioUrl = String(item?.audioUrl || '');
  const video = item?.video as { embedUrl?: string; provider?: string } | null;
  const scriptures = (item?.scriptures as Array<{ label: string }>) || [];

  return (
    <PermissionGate permission="sermons.view">
      <div className="space-y-6">
        <PageHeader
          title="Sermon preview"
          description="Authorized preview only. Draft and scheduled sermons are not public."
          actions={
            <div className="flex gap-2">
              <Button asChild variant="outline">
                <Link href={`/admin/sermons/${id}`}>Edit</Link>
              </Button>
              <Button asChild variant="ghost">
                <Link href="/admin/sermons">Back</Link>
              </Button>
            </div>
          }
        />
        {error ? <ApiErrorAlert message={error} /> : null}
        {item ? (
          <article className="mx-auto max-w-3xl space-y-4 rounded-xl border bg-card p-4 sm:p-8">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{String(item.status)}</Badge>
              <Badge variant="outline">Authorized preview</Badge>
            </div>
            <h1 className="text-3xl font-bold text-primary">{title}</h1>
            {item.speakerName ? <p className="text-muted-foreground">{String(item.speakerName)}</p> : null}
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt={String(item.thumbnailAlt || title)} className="w-full rounded-lg" />
            ) : null}
            {video?.embedUrl ? (
              <VideoPlayer embedUrl={video.embedUrl} title={`${title} video`} />
            ) : null}
            {audioUrl ? <AudioPlayer src={audioUrl} title={title} /> : null}
            {scriptures.length > 0 ? (
              <p className="text-sm">
                Scripture: {scriptures.map((ref) => ref.label).join(', ')}
              </p>
            ) : null}
            {description ? <MarkdownContent content={description} /> : null}
            {notes ? (
              <section>
                <h2 className="text-xl font-semibold text-primary">Notes</h2>
                <MarkdownContent content={notes} />
              </section>
            ) : null}
            {transcript ? (
              <section>
                <h2 className="text-xl font-semibold text-primary">Transcript</h2>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{transcript}</p>
              </section>
            ) : null}
          </article>
        ) : null}
      </div>
    </PermissionGate>
  );
}
