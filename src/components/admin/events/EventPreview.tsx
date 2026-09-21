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
import { formatInTimeZone } from '@/lib/events/timezone';

export function EventPreview({ id }: { id: string }) {
  const [item, setItem] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void apiGet<Record<string, unknown>>(`/admin/events/${id}`).then((result) => {
      if (!result.success || !result.data) {
        setError(result.message || 'Unable to load preview.');
        return;
      }
      setItem(result.data);
    });
  }, [id]);

  const title = String(item?.title || 'Preview');
  const description = String(item?.description || '');
  const image = String(item?.featuredImageUrl || '');
  const timezone = String(item?.timezone || 'Africa/Addis_Ababa');
  const cancelled = item?.status === 'cancelled';

  return (
    <PermissionGate permission="events.view">
      <div className="space-y-6">
        <PageHeader
          title="Event preview"
          description="Authorized preview only. Draft and scheduled events are not public."
          actions={
            <div className="flex gap-2">
              <Button asChild variant="outline">
                <Link href={`/admin/events/${id}`}>Edit</Link>
              </Button>
              <Button asChild variant="ghost">
                <Link href="/admin/events">Back</Link>
              </Button>
            </div>
          }
        />
        {error ? <ApiErrorAlert message={error} /> : null}
        {item ? (
          <article className="mx-auto max-w-3xl space-y-4 rounded-xl border bg-card p-4 sm:p-8">
            <div className="flex flex-wrap gap-2">
              <Badge variant={cancelled ? 'destructive' : 'secondary'}>{String(item.status)}</Badge>
              <Badge variant="outline">Authorized preview</Badge>
              {cancelled ? (
                <span className="rounded border border-destructive px-2 py-0.5 text-xs font-semibold uppercase tracking-wide">
                  Cancelled
                </span>
              ) : null}
            </div>
            <h1 className="text-3xl font-bold text-primary">{title}</h1>
            {item.startAt ? (
              <p className="text-muted-foreground">
                {formatInTimeZone(String(item.startAt), timezone, {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  timeZoneName: 'short',
                })}
              </p>
            ) : null}
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt={String(item.featuredImageAlt || title)} className="w-full rounded-lg" />
            ) : null}
            {description ? <MarkdownContent content={description} /> : null}
          </article>
        ) : null}
      </div>
    </PermissionGate>
  );
}
