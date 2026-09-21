'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';

import { apiGet } from '@/lib/api/client';
import { PageHeader } from '@/components/admin/PageHeader';
import { PermissionGate } from '@/components/admin/PermissionGate';
import { ApiErrorAlert } from '@/components/admin/ApiErrorAlert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface Metrics {
  totalEvents: number;
  upcomingEvents: number;
  completedEvents: number;
  cancelledEvents: number;
  registrations: number;
  cancellations: number;
  waitlisted: number;
  attended: number;
  noShows: number;
  registrationRetentionPercent: number;
}

export default function AdminEventReportsPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void apiGet<{ metrics: Metrics }>('/admin/events/reports').then((result) => {
      if (!result.success || !result.data) {
        setError(result.message);
        toast.error(result.message || 'Unable to load reports.');
        return;
      }
      setMetrics(result.data.metrics);
      setError(null);
    });
  }, []);

  return (
    <PermissionGate permission="events.view">
      <div className="space-y-6">
        <PageHeader
          title="Event reports"
          description="High-level registration and event metrics across the church calendar."
          actions={
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link href="/admin/events">All events</Link>
              </Button>
              <Button asChild variant="ghost">
                <Link href="/admin/events/calendar">Calendar</Link>
              </Button>
            </div>
          }
        />

        {error ? <ApiErrorAlert message={error} /> : null}

        {!metrics ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <Card>
              <CardHeader>
                <CardDescription>Total events</CardDescription>
                <CardTitle>{metrics.totalEvents}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Upcoming</CardDescription>
                <CardTitle>{metrics.upcomingEvents}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Completed</CardDescription>
                <CardTitle>{metrics.completedEvents}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Cancelled events</CardDescription>
                <CardTitle>{metrics.cancelledEvents}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Registrations</CardDescription>
                <CardTitle>{metrics.registrations}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Cancellations</CardDescription>
                <CardTitle>{metrics.cancellations}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Waitlisted</CardDescription>
                <CardTitle>{metrics.waitlisted}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Attended</CardDescription>
                <CardTitle>{metrics.attended}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>No-shows</CardDescription>
                <CardTitle>{metrics.noShows}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Retention %</CardDescription>
                <CardTitle>{metrics.registrationRetentionPercent}</CardTitle>
              </CardHeader>
            </Card>
          </div>
        )}

        <p className="text-sm text-muted-foreground">
          Open an event and use Registrations to review per-event lists and export CSV.
        </p>
      </div>
    </PermissionGate>
  );
}
