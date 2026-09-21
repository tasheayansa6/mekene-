'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
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

interface CommitteeDashboard {
  committee: {
    id: string;
    name: string;
    description: string | null;
    memberCount?: number;
    meetingCount?: number;
  };
  members: Array<{ id: string; memberId: string; roleLabel: string; name: string | null }>;
  upcomingMeetings: Array<{ id: string; title: string; startsAt: string; status: string }>;
  openActionItems: Array<{
    id: string;
    title: string;
    status: string;
    dueAt: string | null;
  }>;
  recentDecisions: Array<{
    id: string;
    title: string;
    status: string;
    decisionDate: string;
  }>;
}

export default function Page() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<CommitteeDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.id) return;
    void apiGet<CommitteeDashboard>(`/governance/committees/${params.id}`).then(
      (result) => {
        if (!result.success || !result.data) {
          setError(result.message);
          return;
        }
        setData(result.data);
      }
    );
  }, [params.id]);

  if (error) return <ApiErrorAlert message={error} />;
  if (!data) return <Skeleton className="m-6 h-72 w-full" />;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{data.committee.name}</h1>
        {data.committee.description ? (
          <p className="text-muted-foreground">{data.committee.description}</p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardDescription>Members</CardDescription>
            <CardTitle className="text-3xl">
              {data.committee.memberCount ?? data.members.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Meetings</CardDescription>
            <CardTitle className="text-3xl">
              {data.committee.meetingCount ?? data.upcomingMeetings.length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y text-sm">
            {data.members.map((m) => (
              <li key={m.id} className="flex justify-between py-2">
                <span>{m.name || m.memberId}</span>
                <span className="text-muted-foreground">{m.roleLabel}</span>
              </li>
            ))}
          </ul>
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
              {data.upcomingMeetings.map((m) => (
                <li key={m.id} className="py-2">
                  <p className="font-medium">{m.title}</p>
                  <p className="text-muted-foreground">
                    {new Date(m.startsAt).toLocaleString()} · {m.status}
                  </p>
                </li>
              ))}
            </ul>
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
                  <p className="text-muted-foreground">{item.status}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
