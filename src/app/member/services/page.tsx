'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

interface ServicesPayload {
  schedules: Array<{
    dayOfWeek: string;
    startTime: string;
    endTime: string | null;
    serviceName: string;
    location: string | null;
  }>;
  upcomingWorshipEvents: Array<{
    title: string;
    slug: string;
    startAt: string;
    isOnline?: boolean;
    live?: { isLive: boolean; slug?: string } | null;
  }>;
}

export default function MemberServicesPage() {
  const [data, setData] = useState<ServicesPayload | null>(null);

  useEffect(() => {
    void apiGet<ServicesPayload>('/services').then((result) => setData(result.data));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-primary">Services</h1>
        <p className="text-sm text-muted-foreground">Upcoming worship times, locations, and live status.</p>
      </div>
      {!data ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <>
          <ul className="space-y-2 text-sm">
            {data.schedules.map((row, index) => (
              <li key={`${row.dayOfWeek}-${index}`} className="rounded-md border p-3">
                <p className="font-medium">{row.serviceName}</p>
                <p className="text-muted-foreground">
                  {row.dayOfWeek} · {row.startTime}
                  {row.endTime ? `–${row.endTime}` : ''}
                  {row.location ? ` · ${row.location}` : ''}
                </p>
              </li>
            ))}
          </ul>
          <div className="space-y-2">
            {data.upcomingWorshipEvents.map((row) => (
              <div key={row.slug} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
                <div>
                  <p className="font-medium">{row.title}</p>
                  <p className="text-sm text-muted-foreground">{new Date(row.startAt).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  {row.live?.isLive ? <Badge variant="destructive">LIVE NOW</Badge> : null}
                  <Button asChild size="sm">
                    <Link href={row.live?.isLive && row.live.slug ? `/live/${row.live.slug}` : `/member/events/${row.slug}`}>
                      Open
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
