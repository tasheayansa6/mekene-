'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api/client';
import { ApiErrorAlert } from '@/components/admin/ApiErrorAlert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface DashboardData {
  appointments: Array<{
    id: string;
    positionTitle: string;
    startAt: string;
    endAt: string | null;
  }>;
  committeesChaired: Array<{ id: string; name: string; memberCount?: number }>;
  committeesMembered: Array<{ id: string; name: string; memberCount?: number }>;
  upcomingMeetings: Array<{
    id: string;
    title: string;
    startsAt: string;
    status: string;
  }>;
  openActionItems: Array<{
    id: string;
    title: string;
    status: string;
    dueAt: string | null;
  }>;
  pendingApprovalsCount: number;
}

export default function Page() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void apiGet<DashboardData>('/governance/dashboard').then((result) => {
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
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Leadership portal</h1>
        <p className="text-muted-foreground">
          Your appointments, committees, meetings, and open action items.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Appointments</CardDescription>
            <CardTitle className="text-3xl">{data.appointments.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Upcoming meetings</CardDescription>
            <CardTitle className="text-3xl">{data.upcomingMeetings.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Pending approvals</CardDescription>
            <CardTitle className="text-3xl">{data.pendingApprovalsCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Committees</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {[...data.committeesChaired, ...data.committeesMembered]
            .filter(
              (c, index, arr) => arr.findIndex((x) => x.id === c.id) === index
            )
            .map((committee) => (
              <Link
                key={committee.id}
                href={`/committee/${committee.id}`}
                className="block hover:underline"
              >
                {committee.name}
              </Link>
            ))}
          {data.committeesChaired.length === 0 &&
            data.committeesMembered.length === 0 && (
              <p className="text-muted-foreground">No committee memberships.</p>
            )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Open action items</CardTitle>
        </CardHeader>
        <CardContent>
          {data.openActionItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">No open action items.</p>
          ) : (
            <ul className="divide-y text-sm">
              {data.openActionItems.map((item) => (
                <li key={item.id} className="py-2">
                  <p className="font-medium">{item.title}</p>
                  <p className="text-muted-foreground">
                    {item.status}
                    {item.dueAt
                      ? ` · due ${new Date(item.dueAt).toLocaleDateString()}`
                      : ''}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming meetings</CardTitle>
        </CardHeader>
        <CardContent>
          {data.upcomingMeetings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No upcoming meetings.</p>
          ) : (
            <ul className="divide-y text-sm">
              {data.upcomingMeetings.map((meeting) => (
                <li key={meeting.id} className="py-2">
                  <p className="font-medium">{meeting.title}</p>
                  <p className="text-muted-foreground">
                    {new Date(meeting.startsAt).toLocaleString()} · {meeting.status}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
