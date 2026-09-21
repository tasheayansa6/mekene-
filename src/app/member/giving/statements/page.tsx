'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface Statement {
  period: {
    label: string;
    start: string;
    end: string;
  };
  church: {
    legalName: string | null;
    registrationInfo: string | null;
  };
  totals: Record<string, string>;
  count: number;
  contributions: Array<{
    id: string;
    reference: string;
    receiptNumber: string | null;
    amount: string;
    currency: string;
    completedAt: string | null;
    createdAt: string;
    category: { name: string } | null;
    campaign: { title: string } | null;
  }>;
  note: string;
}

export default function MemberGivingStatementsPage() {
  const [statement, setStatement] = useState<Statement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void apiGet<{ statement: Statement }>('/giving/statements').then((result) => {
      if (!result.success || !result.data?.statement) {
        setError(result.message || 'Could not load statement.');
        return;
      }
      setStatement(result.data.statement);
    });
  }, []);

  return (
    <div className="space-y-6 print:space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Giving statement</h1>
          <p className="text-sm text-muted-foreground">
            Your confirmed gifts for the current giving period.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => window.print()}>
            Print
          </Button>
          <Button asChild variant="ghost">
            <Link href="/member/giving">Back</Link>
          </Button>
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {!statement && !error ? (
        <Skeleton className="h-48 w-full" />
      ) : null}

      {statement ? (
        <div className="space-y-6 rounded-md border p-4 print:border-0 print:p-0">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">
              {statement.church.legalName || 'Busa Mekene Eyasus Church'}
            </h2>
            {statement.church.registrationInfo ? (
              <p className="text-sm text-muted-foreground">
                {statement.church.registrationInfo}
              </p>
            ) : null}
            <p className="text-sm">
              Period {statement.period.label}:{' '}
              {new Date(statement.period.start).toLocaleDateString()} –{' '}
              {new Date(statement.period.end).toLocaleDateString()}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {Object.entries(statement.totals).length === 0 ? (
              <p className="text-sm text-muted-foreground">No confirmed gifts in this period.</p>
            ) : (
              Object.entries(statement.totals).map(([currency, total]) => (
                <div key={currency} className="rounded-md bg-muted/40 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Total ({currency})
                  </p>
                  <p className="text-xl font-semibold">
                    {currency} {total}
                  </p>
                </div>
              ))
            )}
            <div className="rounded-md bg-muted/40 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Gifts</p>
              <p className="text-xl font-semibold">{statement.count}</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <caption className="sr-only">Confirmed gifts in this period</caption>
              <thead className="border-b bg-muted/40">
                <tr>
                  <th className="p-2 font-medium">Date</th>
                  <th className="p-2 font-medium">Fund</th>
                  <th className="p-2 font-medium">Campaign</th>
                  <th className="p-2 font-medium">Amount</th>
                  <th className="p-2 font-medium">Receipt</th>
                </tr>
              </thead>
              <tbody>
                {statement.contributions.map((row) => (
                  <tr key={row.id} className="border-b">
                    <td className="p-2">
                      {new Date(row.completedAt || row.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-2">{row.category?.name || '—'}</td>
                    <td className="p-2">{row.campaign?.title || '—'}</td>
                    <td className="p-2">
                      {row.currency} {row.amount}
                    </td>
                    <td className="p-2">
                      <Link
                        className="underline print:no-underline"
                        href={`/give/receipt/${row.reference}`}
                      >
                        {row.receiptNumber || row.reference}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-muted-foreground">{statement.note}</p>
        </div>
      ) : null}
    </div>
  );
}
