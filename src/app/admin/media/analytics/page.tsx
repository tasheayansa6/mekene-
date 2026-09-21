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

interface AnalyticsData {
  analytics: {
    totals: {
      plays: number;
      views: number;
      audioDownloads: number;
      notesDownloads: number;
      recentPlays: number;
    };
    popularSpeakers: Array<{ speakerName: string | null; playCount: number }>;
  };
  popular: {
    periodDays: number;
    popular: Array<{
      id: string;
      title: string;
      slug: string;
      playCount: number;
      viewCount: number;
      speakerName: string | null;
      href: string;
    }>;
  };
}

export default function AdminMediaAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void apiGet<AnalyticsData>('/admin/media/analytics').then((result) => {
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
          title="Media analytics"
          description="Aggregate plays, views, downloads, and popular content."
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
                  ['Total plays', data.analytics.totals.plays],
                  ['Total views', data.analytics.totals.views],
                  ['Audio downloads', data.analytics.totals.audioDownloads],
                  ['Notes downloads', data.analytics.totals.notesDownloads],
                  ['Recent plays (30d)', data.analytics.totals.recentPlays],
                ] as const
              ).map(([label, value]) => (
                <Card key={label}>
                  <CardHeader className="pb-2">
                    <CardDescription>{label}</CardDescription>
                    <CardTitle className="text-3xl">{value.toLocaleString()}</CardTitle>
                  </CardHeader>
                </Card>
              ))}
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Popular speakers</CardTitle>
                  <CardDescription>By total play count</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {data.analytics.popularSpeakers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No data yet.</p>
                  ) : (
                    data.analytics.popularSpeakers.map((row) => (
                      <div key={row.speakerName || 'unknown'} className="flex justify-between text-sm">
                        <span>{row.speakerName || 'Unknown'}</span>
                        <span className="tabular-nums text-muted-foreground">
                          {row.playCount.toLocaleString()} plays
                        </span>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Popular sermons</CardTitle>
                  <CardDescription>Last {data.popular.periodDays} days</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {data.popular.popular.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No data yet.</p>
                  ) : (
                    data.popular.popular.map((row) => (
                      <div key={row.id} className="text-sm">
                        <Link className="font-medium hover:text-primary" href={row.href}>
                          {row.title}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {[row.speakerName, `${row.playCount} plays`].filter(Boolean).join(' · ')}
                        </p>
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
