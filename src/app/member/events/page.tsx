'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import { apiGet } from '@/lib/api/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiErrorAlert } from '@/components/admin/ApiErrorAlert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface RegistrationRow {
  id: string;
  reference: string;
  status: string;
  registeredAt: string;
  cancelledAt: string | null;
  waitlistPosition: number | null;
  event: {
    id: string;
    title: string;
    slug: string;
    startAt: string;
    endAt: string;
    timezone: string;
    status: string;
    locationName: string | null;
  };
}

type Filter = 'all' | 'upcoming' | 'past' | 'cancelled';

export default function MemberEventsPage() {
  const [rows, setRows] = useState<RegistrationRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    void apiGet<RegistrationRow[]>('/events/registrations', { pageSize: '50' }).then((result) => {
      setRows(result.data || []);
      setError(result.success ? null : result.message);
    });
  }, []);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const now = Date.now();
    return rows.filter((row) => {
      if (filter === 'cancelled') return row.status === 'cancelled';
      if (filter === 'upcoming') {
        return row.status !== 'cancelled' && new Date(row.event.endAt).getTime() >= now;
      }
      if (filter === 'past') {
        return row.status !== 'cancelled' && new Date(row.event.endAt).getTime() < now;
      }
      return true;
    });
  }, [rows, filter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-primary">My events</h1>
          <p className="text-sm text-muted-foreground">
            Your upcoming, past, and cancelled event registrations.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={filter} onValueChange={(value) => setFilter(value as Filter)}>
            <SelectTrigger className="w-44" aria-label="Filter registrations">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="upcoming">Upcoming</SelectItem>
              <SelectItem value="past">Past</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Button asChild variant="outline">
            <Link href="/events">Browse events</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/member/calendar">Calendar</Link>
          </Button>
        </div>
      </div>

      {error ? <ApiErrorAlert message={error} /> : null}

      {rows === null ? (
        <Skeleton className="h-40 w-full" />
      ) : filtered.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No registrations in this view</CardTitle>
            <CardDescription>
              When you register for a church event, it will appear here.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <caption className="sr-only">Your event registrations</caption>
            <thead className="bg-muted/50">
              <tr>
                <th className="p-3 font-medium">Event</th>
                <th className="p-3 font-medium">When</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Reference</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="p-3">
                    <Link
                      className="font-medium hover:underline"
                      href={`/member/events/registrations/${row.id}`}
                    >
                      {row.event.title}
                    </Link>
                    {row.event.locationName ? (
                      <p className="text-xs text-muted-foreground">{row.event.locationName}</p>
                    ) : null}
                  </td>
                  <td className="p-3">
                    {new Date(row.event.startAt).toLocaleString(undefined, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </td>
                  <td className="p-3">
                    <Badge variant={row.status === 'cancelled' ? 'destructive' : 'secondary'}>
                      {row.status}
                    </Badge>
                  </td>
                  <td className="p-3 font-mono text-xs">{row.reference}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
