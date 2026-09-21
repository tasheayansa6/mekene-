'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface ReceiptRow {
  id: string;
  createdAt: string;
  amount: string;
  currency: string;
  receiptNumber: string | null;
  reference: string;
  href: string;
  category: { name: string } | null;
}

export default function MemberGivingReceiptsPage() {
  const [rows, setRows] = useState<ReceiptRow[] | null>(null);

  useEffect(() => {
    void apiGet<{ receipts: ReceiptRow[] }>('/member/giving/receipts').then((result) => {
      setRows(result.data?.receipts || []);
    });
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Receipts</h1>
          <p className="text-sm text-muted-foreground">Your successful gifts only.</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/member/giving">Back</Link>
        </Button>
      </div>
      {rows === null ? (
        <Skeleton className="h-40 w-full" />
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No receipts yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <caption className="sr-only">Your giving receipts</caption>
            <thead className="bg-muted/50">
              <tr>
                <th className="p-3 font-medium">Date</th>
                <th className="p-3 font-medium">Fund</th>
                <th className="p-3 font-medium">Amount</th>
                <th className="p-3 font-medium">Receipt</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="p-3">{new Date(row.createdAt).toLocaleDateString()}</td>
                  <td className="p-3">{row.category?.name || 'Gift'}</td>
                  <td className="p-3">
                    {row.amount} {row.currency}
                  </td>
                  <td className="p-3">
                    <Link className="underline" href={row.href}>
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
