'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api/client';
import { PageHeader } from '@/components/admin/PageHeader';
import { PermissionGate } from '@/components/admin/PermissionGate';
import { ApiErrorAlert } from '@/components/admin/ApiErrorAlert';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface MemberAttendanceData {
  member: {
    id: string;
    name: string;
    membershipNumber: string | null;
    status: string;
  };
  stats: { totalRecords: number; presentOrLate: number };
  records: Array<{
    id: string;
    statusLabel: string;
    checkInAt: string | null;
    session: { id: string; title: string; startsAt: string; sessionTypeLabel: string };
  }>;
}

export function MemberAttendanceDetail({ id }: { id: string }) {
  const [data, setData] = useState<MemberAttendanceData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void apiGet<MemberAttendanceData>(`/admin/attendance/members/${id}`).then((result) => {
      if (!result.success || !result.data) {
        setError(result.message);
        return;
      }
      setData(result.data);
    });
  }, [id]);

  if (error) return <ApiErrorAlert message={error} />;
  if (!data) return <Skeleton className="h-48 w-full" />;

  return (
    <PermissionGate permission="attendance.view">
      <div className="space-y-6">
        <PageHeader
          title={data.member.name}
          description={
            data.member.membershipNumber
              ? `Membership ${data.member.membershipNumber}`
              : 'Member attendance history'
          }
          actions={
            <Link className="text-sm underline" href={`/admin/members/${data.member.id}`}>
              Member profile
            </Link>
          }
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardDescription>Total records</CardDescription>
              <CardTitle>{data.stats.totalRecords}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Present or late</CardDescription>
              <CardTitle>{data.stats.presentOrLate}</CardTitle>
            </CardHeader>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>History</CardTitle>
            <CardDescription>Phone and email are not included.</CardDescription>
          </CardHeader>
          <CardContent>
            {data.records.length === 0 ? (
              <p className="text-sm text-muted-foreground">No attendance records available.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {data.records.map((row) => (
                  <li key={row.id}>
                    <Link
                      className="font-medium hover:underline"
                      href={`/admin/attendance/sessions/${row.session.id}`}
                    >
                      {row.session.title}
                    </Link>{' '}
                    · {new Date(row.session.startsAt).toLocaleDateString()} · {row.statusLabel}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </PermissionGate>
  );
}
