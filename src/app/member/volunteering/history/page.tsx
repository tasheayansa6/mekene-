'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface HistoryRow {
  id: string;
  roleName: string;
  statusLabel: string;
  scheduledAt: string;
  hoursMinutes: number | null;
  ministry: { name: string } | null;
  team: { name: string } | null;
  event: { title: string } | null;
}

export default function MemberVolunteerHistoryPage() {
  const [rows, setRows] = useState<HistoryRow[] | null>(null);
  const [hours, setHours] = useState(0);

  useEffect(() => {
    void apiGet<{ history: HistoryRow[]; hoursMinutes: number }>(
      '/members/me/volunteering/history'
    ).then((result) => {
      setRows(result.data?.history || []);
      setHours(result.data?.hoursMinutes || 0);
    });
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Service history</h1>
          <p className="text-sm text-muted-foreground">
            Your ministry service record. Hours are calculated from validated attendance.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/member/volunteering">Back</Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardDescription>Total service minutes</CardDescription>
          <CardTitle>{hours}</CardTitle>
        </CardHeader>
      </Card>
      {!rows ? (
        <Skeleton className="h-40 w-full" />
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">No history yet.</CardContent>
        </Card>
      ) : (
        rows.map((row) => (
          <Card key={row.id}>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <CardTitle>{row.roleName}</CardTitle>
                  <CardDescription>
                    {row.event?.title || 'Service'}
                    {row.ministry?.name ? ` · ${row.ministry.name}` : ''}
                    {row.team?.name ? ` · ${row.team.name}` : ''}
                  </CardDescription>
                </div>
                <Badge variant="secondary">{row.statusLabel}</Badge>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {new Date(row.scheduledAt).toLocaleString()}
              {row.hoursMinutes != null ? ` · ${row.hoursMinutes} min` : ''}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
