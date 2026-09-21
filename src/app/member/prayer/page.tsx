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
import { ApiErrorAlert } from '@/components/admin/ApiErrorAlert';

interface MemberRow {
  id: string;
  title: string;
  status: string;
  statusLabel: string;
  createdAt: string;
  updatedAt: string;
  category: { name: string } | null;
}

export default function MemberPrayerPage() {
  const [rows, setRows] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void apiGet<MemberRow[]>('/prayer/my').then((result) => {
      setRows(result.data || []);
      setError(result.success ? null : result.message);
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-primary">My prayer requests</h1>
          <p className="text-sm text-muted-foreground">
            Only you can see these private records. Other members cannot open them.
          </p>
        </div>
        <Button asChild>
          <Link href="/prayer/request">Submit a request</Link>
        </Button>
      </div>

      {error ? <ApiErrorAlert message={error} /> : null}

      {loading ? (
        <Skeleton className="h-40 w-full" />
      ) : rows.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No requests yet</CardTitle>
            <CardDescription>
              When you submit a prayer request, it will appear here with a simple status.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <caption className="sr-only">Your prayer requests</caption>
            <thead className="bg-muted/50">
              <tr>
                <th className="p-3 font-medium">Request</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Submitted</th>
                <th className="p-3 font-medium">Last updated</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="p-3">
                    <Link className="font-medium hover:underline" href={`/member/prayer/${row.id}`}>
                      {row.title}
                    </Link>
                    {row.category ? (
                      <p className="text-xs text-muted-foreground">{row.category.name}</p>
                    ) : null}
                  </td>
                  <td className="p-3">{row.statusLabel}</td>
                  <td className="p-3">{new Date(row.createdAt).toLocaleDateString()}</td>
                  <td className="p-3">{new Date(row.updatedAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
