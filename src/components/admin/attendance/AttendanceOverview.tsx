'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api/client';
import { PageHeader } from '@/components/admin/PageHeader';
import { PermissionGate } from '@/components/admin/PermissionGate';
import { ApiErrorAlert } from '@/components/admin/ApiErrorAlert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface OverviewData {
  todayCheckedIn: number;
  weekPresent: number;
  openSessions: Array<{
    id: string;
    title: string;
    statusLabel: string;
    recordCount: number;
    startsAt: string;
  }>;
  todaySessions: Array<{
    id: string;
    title: string;
    statusLabel: string;
    recordCount: number;
    startsAt: string;
  }>;
  recentCheckIns: Array<{
    id: string;
    checkInAt: string | null;
    member: { name: string; membershipNumber: string | null };
    session: { id: string; title: string };
  }>;
}

export function AttendanceOverview({ focusToday }: { focusToday?: boolean }) {
  const [data, setData] = useState<OverviewData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void apiGet<OverviewData>('/admin/attendance/overview').then((result) => {
      if (!result.success || !result.data) {
        setError(result.message);
        return;
      }
      setData(result.data);
    });
  }, []);

  if (error) return <ApiErrorAlert message={error} />;
  if (!data) return <Skeleton className="h-72 w-full" />;

  return (
    <PermissionGate permission="attendance.view">
      <div className="space-y-6">
        <PageHeader
          title="Attendance"
          description="Service, ministry, and event check-in. Individual attendance is private."
          actions={
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href="/admin/attendance/sessions/create">New session</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/admin/attendance/check-in">Staff check-in</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/admin/attendance/reports">Reports</Link>
              </Button>
            </div>
          }
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader>
              <CardDescription>Today checked in</CardDescription>
              <CardTitle className="text-3xl">{data.todayCheckedIn}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Open sessions</CardDescription>
              <CardTitle className="text-3xl">{data.openSessions.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Present or late (7 days)</CardDescription>
              <CardTitle className="text-3xl">{data.weekPresent}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{focusToday ? "Today's attendance" : 'Active sessions'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(focusToday ? data.todaySessions : data.openSessions).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No attendance sessions are currently open.
              </p>
            ) : (
              (focusToday ? data.todaySessions : data.openSessions).map((session) => (
                <div
                  key={session.id}
                  className="flex flex-col gap-2 border-b py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <Link className="font-medium hover:underline" href={`/admin/attendance/sessions/${session.id}`}>
                      {session.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {new Date(session.startsAt).toLocaleString()} · {session.recordCount} recorded
                    </p>
                  </div>
                  <Badge variant="secondary">{session.statusLabel}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent check-ins</CardTitle>
            <CardDescription>Names only. No phone or email is listed.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data.recentCheckIns.length === 0 ? (
              <p className="text-muted-foreground">No recent check-ins.</p>
            ) : (
              data.recentCheckIns.map((row) => (
                <p key={row.id}>
                  {row.member.name}
                  {row.member.membershipNumber ? ` · ${row.member.membershipNumber}` : ''} ·{' '}
                  {row.session.title}
                  {row.checkInAt ? ` · ${new Date(row.checkInAt).toLocaleTimeString()}` : ''}
                </p>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </PermissionGate>
  );
}
