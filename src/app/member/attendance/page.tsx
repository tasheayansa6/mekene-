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
import { Skeleton } from '@/components/ui/skeleton';
import { ApiErrorAlert } from '@/components/admin/ApiErrorAlert';
import { Button } from '@/components/ui/button';

interface AttendanceRow {
  id: string;
  statusLabel: string;
  methodLabel: string;
  checkInAt: string | null;
  session: {
    id: string;
    title: string;
    sessionTypeLabel: string;
    startsAt: string;
  };
}

export default function MemberAttendancePage() {
  const [rows, setRows] = useState<AttendanceRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void apiGet<AttendanceRow[]>('/attendance/my').then((result) => {
      setRows(result.data || []);
      setError(result.success ? null : result.message);
    });
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-primary">My attendance</h1>
          <p className="text-sm text-muted-foreground">
            Only your own attendance history is shown here.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/member/check-in">Check in</Link>
        </Button>
      </div>

      {error ? <ApiErrorAlert message={error} /> : null}

      {rows === null ? (
        <Skeleton className="h-40 w-full" />
      ) : rows.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No attendance records available.</CardTitle>
            <CardDescription>
              After you check in to an open session, your history will appear here.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <caption className="sr-only">Your attendance history</caption>
            <thead className="bg-muted/50">
              <tr>
                <th className="p-3 font-medium">Date</th>
                <th className="p-3 font-medium">Service</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Check-in</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="p-3">
                    {new Date(row.session.startsAt).toLocaleDateString()}
                  </td>
                  <td className="p-3">
                    <p className="font-medium">{row.session.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.session.sessionTypeLabel}
                    </p>
                  </td>
                  <td className="p-3">{row.statusLabel}</td>
                  <td className="p-3">
                    {row.checkInAt ? new Date(row.checkInAt).toLocaleTimeString() : '—'}
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
