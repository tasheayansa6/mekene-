'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface Row {
  id: string;
  createdAt: string;
  amount: string;
  currency: string;
  statusLabel: string;
  receiptNumber: string | null;
  reference: string;
  category: { name: string } | null;
  campaign: { title: string } | null;
}

export default function MemberGivingHistoryPage() {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    void apiGet<{ contributions: Row[] }>('/giving/my').then((result) => {
      setRows(result.data?.contributions || []);
    });
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Giving history</h1>
          <p className="text-sm text-muted-foreground">Your contributions only.</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/member/giving">Back</Link>
        </Button>
      </div>

      {rows === null ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <caption className="sr-only">Your contribution history</caption>
            <thead className="bg-muted/50">
              <tr>
                <th className="p-3 font-medium">Date</th>
                <th className="p-3 font-medium">Type</th>
                <th className="p-3 font-medium">Campaign</th>
                <th className="p-3 font-medium">Amount</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Receipt</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="p-3">{new Date(row.createdAt).toLocaleDateString()}</td>
                  <td className="p-3">{row.category?.name || '—'}</td>
                  <td className="p-3">{row.campaign?.title || '—'}</td>
                  <td className="p-3">
                    {row.amount} {row.currency}
                  </td>
                  <td className="p-3">{row.statusLabel}</td>
                  <td className="p-3">
                    <Link className="underline" href={`/give/receipt/${row.reference}`}>
                      {row.receiptNumber || row.reference}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
