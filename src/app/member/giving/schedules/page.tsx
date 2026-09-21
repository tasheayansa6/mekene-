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
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface ScheduleRow {
  id: string;
  amount: string;
  currency: string;
  frequency: string;
  frequencyLabel?: string;
  status: string;
  statusLabel?: string;
  nextPaymentAt: string | null;
  fund: { name: string } | null;
}

export default function MemberGivingSchedulesPage() {
  const [rows, setRows] = useState<ScheduleRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void apiGet<ScheduleRow[]>('/giving/schedules').then((result) => {
      if (!result.success) {
        setError(result.message);
        setRows([]);
        return;
      }
      setRows(result.data || []);
    });
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Recurring schedules</h1>
          <p className="text-sm text-muted-foreground">
            Your own recurring gifts only. Pause or cancel through your payment provider if needed.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/member/giving">Back to giving</Link>
          </Button>
          <Button asChild>
            <Link href="/give">Give</Link>
          </Button>
        </div>
      </div>

      {rows === null ? (
        <Skeleton className="h-40 w-full" />
      ) : error ? (
        <Card>
          <CardHeader>
            <CardTitle>Unavailable</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      ) : rows.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No schedules</CardTitle>
            <CardDescription>You do not have any recurring giving schedules yet.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <Card key={row.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base">
                    {row.fund?.name || 'Gift'} · {row.amount} {row.currency}
                  </CardTitle>
                  <CardDescription>
                    {row.frequencyLabel || row.frequency}
                    {row.nextPaymentAt
                      ? ` · next ${new Date(row.nextPaymentAt).toLocaleDateString()}`
                      : ''}
                  </CardDescription>
                </div>
                <Badge variant="secondary">{row.statusLabel || row.status}</Badge>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Managed from your member giving account.
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
