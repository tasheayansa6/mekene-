'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

interface Occurrence {
  slug: string;
  title: string;
  startAt: string;
  endAt: string;
  locationName: string | null;
  isOnline: boolean;
}

export default function MemberCalendarPage() {
  const [rows, setRows] = useState<Occurrence[] | null>(null);

  useEffect(() => {
    void apiGet<{ occurrences: Occurrence[] }>('/member/calendar').then((result) => {
      setRows(result.data?.occurrences || []);
    });
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-primary">Church calendar</h1>
        <p className="text-sm text-muted-foreground">This month’s services and events.</p>
      </div>
      {rows === null ? (
        <Skeleton className="h-40 w-full" />
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing scheduled in this range.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li key={`${row.slug}-${row.startAt}`} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm">
              <div>
                <p className="font-medium">{row.title}</p>
                <p className="text-muted-foreground">
                  {new Date(row.startAt).toLocaleString()}
                  {row.locationName ? ` · ${row.locationName}` : row.isOnline ? ' · Online' : ''}
                </p>
              </div>
              <div className="flex gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link href={`/member/events/${row.slug}`}>Open</Link>
                </Button>
                <Button asChild size="sm" variant="ghost">
                  <Link href={`/api/v1/events/${row.slug}/ics`}>ICS</Link>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
