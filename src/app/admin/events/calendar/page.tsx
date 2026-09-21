'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { apiGet } from '@/lib/api/client';
import { PageHeader } from '@/components/admin/PageHeader';
import { PermissionGate } from '@/components/admin/PermissionGate';
import { ApiErrorAlert } from '@/components/admin/ApiErrorAlert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatInTimeZone } from '@/lib/events/timezone';

interface EventRow {
  id: string;
  title: string;
  slug: string;
  status: string;
  startAt: string;
  endAt: string;
  timezone: string;
  capacity: number | null;
  registrationRequired: boolean;
  location: { name: string } | null;
}

export default function AdminEventsCalendarPage() {
  const [rows, setRows] = useState<EventRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void apiGet<EventRow[]>('/admin/events', {
      pageSize: '50',
      sort: 'startAt',
      dir: 'asc',
      status: 'published',
    }).then((result) => {
      const now = Date.now();
      const upcoming = (result.data || []).filter(
        (row) => new Date(row.endAt).getTime() >= now
      );
      setRows(upcoming);
      setError(result.success ? null : result.message);
    });
  }, []);

  return (
    <PermissionGate permission="events.view">
      <div className="space-y-6">
        <PageHeader
          title="Events calendar"
          description="Upcoming published events. Open Registrations for capacity details and exports."
          actions={
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link href="/admin/events">All events</Link>
              </Button>
              <Button asChild variant="ghost">
                <Link href="/calendar">Public calendar</Link>
              </Button>
            </div>
          }
        />

        {error ? <ApiErrorAlert message={error} /> : null}

        {rows === null ? (
          <Skeleton className="h-48 w-full" />
        ) : rows.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No upcoming published events</CardTitle>
              <CardDescription>Publish an event to see it here.</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <caption className="sr-only">Upcoming published events</caption>
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-3 font-medium">Event</th>
                  <th className="p-3 font-medium">When</th>
                  <th className="p-3 font-medium">Capacity</th>
                  <th className="p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t">
                    <td className="p-3">
                      <p className="font-medium">{row.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {row.location?.name || '—'}
                      </p>
                    </td>
                    <td className="p-3">
                      {formatInTimeZone(row.startAt, row.timezone, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="p-3">
                      {row.registrationRequired ? (
                        <Badge variant="secondary">
                          {row.capacity != null ? `Cap ${row.capacity}` : 'Open'}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">Not required</span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-2">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/admin/events/${row.id}/registrations`}>
                            Registrations
                          </Link>
                        </Button>
                        <Button asChild size="sm" variant="ghost">
                          <Link href={`/admin/events/${row.id}`}>Edit</Link>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PermissionGate>
  );
}
