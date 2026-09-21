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
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface Overview {
  metrics: {
    income: string;
    expenses: string;
    net: string;
    currency: string;
    pendingExpenses: number;
    openReconciliations: number;
    givingTotal: string;
    givingCount?: number;
  };
}

export function FinanceOverview() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void apiGet<Overview>('/admin/finance/overview').then((result) => {
      if (!result.success || !result.data) {
        setError(result.message);
        return;
      }
      setData(result.data);
    });
  }, []);

  return (
    <PermissionGate permission="finance.view">
      <div className="space-y-6">
        <PageHeader
          title="Finance"
          description="Aggregated income, expenses, and giving totals only. Donor names are never shown here."
          actions={
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href="/admin/finance/expenses">Expenses</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/admin/finance/funds">Funds</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/admin/finance/payment-providers">Providers</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/admin/finance/budgets">Budgets</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/admin/finance/reconciliation">Reconciliation</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/admin/finance/reports">Reports</Link>
              </Button>
              <Button asChild variant="ghost">
                <Link href="/admin/finance/ledger">Ledger</Link>
              </Button>
            </div>
          }
        />

        {error ? <ApiErrorAlert message={error} /> : null}
        {!data ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Card>
              <CardHeader>
                <CardDescription>Income</CardDescription>
                <CardTitle>
                  {data.metrics.income} {data.metrics.currency}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Expenses</CardDescription>
                <CardTitle>
                  {data.metrics.expenses} {data.metrics.currency}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Net</CardDescription>
                <CardTitle>
                  {data.metrics.net} {data.metrics.currency}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Pending expenses</CardDescription>
                <CardTitle>{data.metrics.pendingExpenses}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Open reconciliations</CardDescription>
                <CardTitle>{data.metrics.openReconciliations}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Giving totals</CardDescription>
                <CardTitle>
                  {data.metrics.givingTotal} {data.metrics.currency}
                </CardTitle>
                {typeof data.metrics.givingCount === 'number' ? (
                  <CardDescription>
                    {data.metrics.givingCount} successful gifts
                  </CardDescription>
                ) : null}
              </CardHeader>
            </Card>
          </div>
        )}
      </div>
    </PermissionGate>
  );
}
