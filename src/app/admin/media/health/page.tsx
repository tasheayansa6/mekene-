'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api/client';
import { PageHeader } from '@/components/admin/PageHeader';
import { PermissionGate } from '@/components/admin/PermissionGate';
import { ApiErrorAlert } from '@/components/admin/ApiErrorAlert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface HealthData {
  aggregates: {
    publishedChecked: number;
    brokenAudioCount: number;
    brokenVideoCount: number;
    failedJobsCount: number;
    emptyPublishedPlaylistsCount: number;
  };
  brokenAudio: Array<{ id: string; slug: string; title: string }>;
  brokenVideo: Array<{ id: string; slug: string; title: string }>;
}

export default function AdminMediaHealthPage() {
  const [data, setData] = useState<HealthData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void apiGet<HealthData>('/admin/media/health').then((result) => {
      if (!result.success || !result.data) {
        setError(result.message);
        return;
      }
      setData(result.data);
    });
  }, []);

  return (
    <PermissionGate permission="media.view">
      <div className="space-y-6">
        <PageHeader
          title="Media health"
          description="Broken files, failed jobs, and empty playlists."
          actions={
            <Button asChild variant="outline">
              <Link href="/admin/media">Back to media</Link>
            </Button>
          }
        />
        {error ? <ApiErrorAlert message={error} /> : null}
        {!data ? <Skeleton className="h-40 w-full" /> : null}
        {data ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {(
                [
                  ['Sermons checked', data.aggregates.publishedChecked],
                  ['Broken audio', data.aggregates.brokenAudioCount],
                  ['Broken video', data.aggregates.brokenVideoCount],
                  ['Failed jobs', data.aggregates.failedJobsCount],
                  ['Empty playlists', data.aggregates.emptyPublishedPlaylistsCount],
                ] as const
              ).map(([label, value]) => (
                <Card key={label}>
                  <CardHeader className="pb-2">
                    <CardDescription>{label}</CardDescription>
                    <CardTitle className="text-3xl">{value}</CardTitle>
                  </CardHeader>
                </Card>
              ))}
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Broken audio files</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {data.brokenAudio.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No broken audio detected.</p>
                  ) : (
                    data.brokenAudio.map((row) => (
                      <div key={row.id} className="text-sm">
                        <Link className="hover:text-primary" href={`/admin/sermons/${row.id}`}>
                          {row.title}
                        </Link>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Broken video files</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {data.brokenVideo.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No broken local video detected.</p>
                  ) : (
                    data.brokenVideo.map((row) => (
                      <div key={row.id} className="text-sm">
                        <Link className="hover:text-primary" href={`/admin/sermons/${row.id}`}>
                          {row.title}
                        </Link>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        ) : null}
      </div>
    </PermissionGate>
  );
}
