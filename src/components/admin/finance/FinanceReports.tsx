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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

interface ReportBucket {
  label?: string;
  key?: string;
  amount?: string;
  count?: number;
}

interface ReportsData {
  range: { from: string; to: string };
  currency?: string;
  totals: {
    income: string;
    expenses: string;
    net: string;
    givingTotal?: string;
  };
  incomeByCategory?: ReportBucket[];
  expensesByCategory?: ReportBucket[];
  givingByFund?: ReportBucket[];
}

export function FinanceReports() {
  const [data, setData] = useState<ReportsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  function load(nextFrom = from, nextTo = to) {
    const params: Record<string, string> = {};
    if (nextFrom) params.from = nextFrom;
    if (nextTo) params.to = nextTo;
    void apiGet<ReportsData>('/admin/finance/reports', params).then((result) => {
      if (!result.success || !result.data) {
        setError(result.message);
        return;
      }
      setError(null);
      setData(result.data);
    });
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <PermissionGate permission="finance.view">
      <div className="space-y-6">
        <PageHeader
          title="Finance reports"
          description="Aggregates only. Donor-level contribution detail is never included."
          actions={
            <Button asChild variant="outline">
              <Link href="/admin/finance">Overview</Link>
            </Button>
          }
        />

        <Card>
          <CardHeader>
            <CardTitle>Date range</CardTitle>
            {data ? (
              <CardDescription>
                Showing {new Date(data.range.from).toLocaleDateString()} –{' '}
                {new Date(data.range.to).toLocaleDateString()}
              </CardDescription>
            ) : (
              <CardDescription>Filter report totals by date.</CardDescription>
            )}
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="space-y-2">
              <Label htmlFor="finance-from">From</Label>
              <Input
                id="finance-from"
                type="date"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="finance-to">To</Label>
              <Input
                id="finance-to"
                type="date"
                value={to}
                onChange={(event) => setTo(event.target.value)}
              />
            </div>
            <Button onClick={() => load(from, to)}>Apply</Button>
          </CardContent>
        </Card>

        {error ? <ApiErrorAlert message={error} /> : null}
        {!data ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Card>
                <CardHeader>
                  <CardDescription>Income</CardDescription>
                  <CardTitle>
                    {data.totals.income}
                    {data.currency ? ` ${data.currency}` : ''}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardDescription>Expenses</CardDescription>
                  <CardTitle>
                    {data.totals.expenses}
                    {data.currency ? ` ${data.currency}` : ''}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardDescription>Net</CardDescription>
                  <CardTitle>
                    {data.totals.net}
                    {data.currency ? ` ${data.currency}` : ''}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardDescription>Giving total</CardDescription>
                  <CardTitle>
                    {data.totals.givingTotal ?? '—'}
                    {data.totals.givingTotal && data.currency ? ` ${data.currency}` : ''}
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <BucketCard
                title="Income by category"
                rows={data.incomeByCategory}
                currency={data.currency}
              />
              <BucketCard
                title="Expenses by category"
                rows={data.expensesByCategory}
                currency={data.currency}
              />
              <BucketCard
                title="Giving by fund"
                rows={data.givingByFund}
                currency={data.currency}
              />
            </div>
          </>
        )}
      </div>
    </PermissionGate>
  );
}

function BucketCard({
  title,
  rows,
  currency,
}: {
  title: string;
  rows?: ReportBucket[];
  currency?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {!rows || rows.length === 0 ? (
          <p className="text-muted-foreground">No breakdown available.</p>
        ) : (
          rows.map((row, index) => (
            <p key={`${row.key || row.label || 'row'}-${index}`}>
              {row.label || row.key || 'Item'}
              {row.amount != null
                ? ` · ${row.amount}${currency ? ` ${currency}` : ''}`
                : ''}
              {typeof row.count === 'number' ? ` · ${row.count}` : ''}
            </p>
          ))
        )}
      </CardContent>
    </Card>
  );
}
