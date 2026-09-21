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

interface Overview {
  metrics: {
    publishedSermons: number;
    draftSermons: number;
    bibleStudies: number;
    seriesCount: number;
    audioCount: number;
    videoCount: number;
    resourceCount: number;
    bookmarkCount: number;
    pendingJobs: number;
  };
  youtube: { configured: boolean; apiKeyPresent: boolean };
  sections: Array<{ label: string; href: string }>;
}

export default function AdminMediaPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void apiGet<Overview>('/admin/media/overview').then((result) => {
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
          title="Media library"
          description="Sermons, Bible studies, series, resources, and processing overview. Credentials stay server-side."
          actions={
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href="/admin/sermons/create">Add sermon</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/admin/media/analytics">Analytics</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/admin/media/health">Health</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/admin/media/playlists">Playlists</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/admin/media/jobs">Jobs</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/admin/media/reports">Reports</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/admin/content/resources">Resources</Link>
              </Button>
            </div>
          }
        />
        {error ? <ApiErrorAlert message={error} /> : null}
        {!data ? <Skeleton className="h-40 w-full" /> : null}
        {data ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {(
                [
                  ['Published sermons', data.metrics.publishedSermons],
                  ['Drafts', data.metrics.draftSermons],
                  ['Bible studies', data.metrics.bibleStudies],
                  ['Series', data.metrics.seriesCount],
                  ['With audio', data.metrics.audioCount],
                  ['With video', data.metrics.videoCount],
                  ['Published resources', data.metrics.resourceCount],
                  ['Member bookmarks', data.metrics.bookmarkCount],
                  ['Pending media jobs', data.metrics.pendingJobs],
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
            <Card>
              <CardHeader>
                <CardTitle>Sections</CardTitle>
                <CardDescription>
                  YouTube provider:{' '}
                  {data.youtube.apiKeyPresent
                    ? 'API key present (server only)'
                    : 'reference/embed mode (no API key)'}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {data.sections.map((section) => (
                  <Button key={section.href} asChild variant="secondary">
                    <Link href={section.href}>{section.label}</Link>
                  </Button>
                ))}
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </PermissionGate>
  );
}
