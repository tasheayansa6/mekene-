'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api/client';
import { PageHeader } from '@/components/admin/PageHeader';
import { PermissionGate } from '@/components/admin/PermissionGate';
import { ApiErrorAlert } from '@/components/admin/ApiErrorAlert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface Overview {
  metrics: {
    totalSuccessful: string;
    currency: string;
    successfulCount: number;
    pendingCount: number;
    failedCount: number;
    refundCount: number;
  };
  recent: Array<{
    id: string;
    reference: string;
    amount: string;
    currency: string;
    statusLabel: string;
    category: { name: string } | null;
  }>;
  provider: { displayName: string; onlineCheckoutAvailable: boolean };
}

export default function AdminGivingPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void apiGet<Overview>('/admin/giving/overview').then((result) => {
      if (!result.success || !result.data) {
        setError(result.message);
        return;
      }
      setData(result.data);
    });
  }, []);

  return (
    <PermissionGate permission="giving.view">
      <div className="space-y-6">
        <PageHeader
          title="Giving"
          description="Tithes, offerings, and donations. Card data is never stored."
          actions={
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href="/admin/giving/record">Record offline</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/admin/giving/contributions">Contributions</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/admin/giving/campaigns">Campaigns</Link>
              </Button>
              <Button asChild variant="ghost">
                <a href="/api/v1/admin/giving/export">Export CSV</a>
              </Button>
            </div>
          }
        />

        {error ? <ApiErrorAlert message={error} /> : null}
        {!data ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Card>
                <CardHeader>
                  <CardDescription>Successful total</CardDescription>
                  <CardTitle>
                    {data.metrics.totalSuccessful} {data.metrics.currency}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardDescription>Pending</CardDescription>
                  <CardTitle>{data.metrics.pendingCount}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardDescription>Failed</CardDescription>
                  <CardTitle>{data.metrics.failedCount}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardDescription>Refunds</CardDescription>
                  <CardTitle>{data.metrics.refundCount}</CardTitle>
                </CardHeader>
              </Card>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Recent contributions</CardTitle>
                <CardDescription>
                  Provider: {data.provider.displayName}
                  {data.provider.onlineCheckoutAvailable
                    ? ''
                    : ' (online checkout adapter not active)'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {data.recent.length === 0 ? (
                  <p className="text-muted-foreground">No contributions yet.</p>
                ) : (
                  data.recent.map((row) => (
                    <p key={row.id}>
                      <Link
                        className="font-medium hover:underline"
                        href={`/admin/giving/contributions/${row.id}`}
                      >
                        {row.reference}
                      </Link>{' '}
                      · {row.category?.name} · {row.amount} {row.currency} · {row.statusLabel}
                    </p>
                  ))
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </PermissionGate>
  );
}
