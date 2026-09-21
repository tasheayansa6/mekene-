'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api/client';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface GivingHome {
  summary: { totalSuccessful: string; currency: string; count: number };
  contributions: Array<{
    id: string;
    reference: string;
    amount: string;
    currency: string;
    statusLabel: string;
    createdAt: string;
    category: { name: string } | null;
  }>;
}

export default function MemberGivingPage() {
  const [data, setData] = useState<GivingHome | null>(null);

  useEffect(() => {
    void apiGet<GivingHome>('/giving/my').then((result) => {
      if (result.success && result.data) setData(result.data);
    });
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-primary">My giving</h1>
          <p className="text-sm text-muted-foreground">
            Only your own contribution history is shown here.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/give/now">Give</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/member/giving/history">History</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/member/giving/receipts">Receipts</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/member/giving/statements">Statements</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/member/giving/recurring">Recurring</Link>
          </Button>
        </div>
      </div>

      {!data ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardDescription>Successful total</CardDescription>
                <CardTitle>
                  {data.summary.totalSuccessful} {data.summary.currency}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Successful gifts</CardDescription>
                <CardTitle>{data.summary.count}</CardTitle>
              </CardHeader>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Recent contributions</CardTitle>
            </CardHeader>
            <div className="space-y-2 px-6 pb-6 text-sm">
              {data.contributions.length === 0 ? (
                <p className="text-muted-foreground">No contributions yet.</p>
              ) : (
                data.contributions.slice(0, 8).map((row) => (
                  <p key={row.id}>
                    {new Date(row.createdAt).toLocaleDateString()} ·{' '}
                    {row.category?.name || 'Gift'} · {row.amount} {row.currency} ·{' '}
                    {row.statusLabel}
                  </p>
                ))
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
