'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api/client';
import { PageHeader } from '@/components/admin/PageHeader';
import { PermissionGate } from '@/components/admin/PermissionGate';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface AnalyticsOverview {
  liveNow: number;
  scheduled: number;
  endedRecent: number;
  totalSessions: number;
}

export function LiveAnalyticsOverview() {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void apiGet<AnalyticsOverview>('/admin/live/analytics').then((result) => {
      if (result.success && result.data) setOverview(result.data);
      setLoading(false);
    });
  }, []);

  return (
    <PermissionGate permission="events.view">
      <div className="space-y-6">
        <PageHeader
          title="Live analytics"
          description="Overview of live worship streaming activity."
          actions={
            <Button asChild variant="outline">
              <Link href="/admin/live">Back to live sessions</Link>
            </Button>
          }
        />

        {loading ? (
          <p className="text-muted-foreground">Loading analytics…</p>
        ) : overview ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader>
                <CardDescription>Live now</CardDescription>
                <CardTitle className="text-3xl">{overview.liveNow}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Scheduled upcoming</CardDescription>
                <CardTitle className="text-3xl">{overview.scheduled}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Ended (last 30 days)</CardDescription>
                <CardTitle className="text-3xl">{overview.endedRecent}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>All sessions</CardDescription>
                <CardTitle className="text-3xl">{overview.totalSessions}</CardTitle>
              </CardHeader>
            </Card>
          </div>
        ) : (
          <p className="text-destructive">Unable to load analytics.</p>
        )}
      </div>
    </PermissionGate>
  );
}
