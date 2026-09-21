'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface CalendarItem {
  kind: string;
  startAt: string;
  endAt: string | null;
  title: string;
  session?: string;
  assignment?: { roleName: string; statusLabel: string; event: { title: string } | null };
}

export default function MemberVolunteerCalendarPage() {
  const [items, setItems] = useState<CalendarItem[] | null>(null);

  useEffect(() => {
    void apiGet<{ items: CalendarItem[] }>('/members/me/volunteering/calendar').then((result) => {
      setItems(result.data?.items || []);
    });
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Volunteer calendar</h1>
          <p className="text-sm text-muted-foreground">
            Upcoming assignments and training for you only.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/member/volunteering">Back</Link>
        </Button>
      </div>
      {!items ? (
        <Skeleton className="h-40 w-full" />
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">Nothing scheduled.</CardContent>
        </Card>
      ) : (
        items.map((item, index) => (
          <Card key={`${item.kind}-${item.startAt}-${index}`}>
            <CardHeader>
              <CardTitle>{item.title}</CardTitle>
              <CardDescription>
                {item.kind === 'training' ? 'Training' : 'Assignment'} ·{' '}
                {new Date(item.startAt).toLocaleString()}
                {item.endAt ? ` – ${new Date(item.endAt).toLocaleString()}` : ''}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {item.session || item.assignment?.event?.title || item.assignment?.statusLabel || ''}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
