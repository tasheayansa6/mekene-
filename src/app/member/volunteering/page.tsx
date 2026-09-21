'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api/client';
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

interface VolunteeringHome {
  profile: {
    status: string;
    statusLabel: string;
    joinedAt: string | null;
  } | null;
  skills: Array<{ id: string; proficiency: string; skill: { id: string; name: string } }>;
  teams: Array<{
    id: string;
    roleLabel: string | null;
    status: string;
    team: {
      id: string;
      name: string;
      ministry: { id: string; name: string } | null;
    };
  }>;
  upcoming: Array<{
    id: string;
    roleName: string;
    statusLabel: string;
    scheduledAt: string;
    event: { title: string } | null;
  }>;
  hoursMinutes: number;
  training: Array<{ id: string; statusLabel: string; program: string; session: string }>;
  requests: Array<{ id: string; type: string; status: string }>;
  participation: {
    confirmedAssignments: number;
    completedAssignments: number;
    completionRatio: number | null;
  } | null;
  applications: Array<{
    id: string;
    statusLabel: string;
    preferredMinistry: string | null;
    ministry: { name: string } | null;
    reviewerMessage: string | null;
  }>;
}

export default function MemberVolunteeringPage() {
  const [data, setData] = useState<VolunteeringHome | null>(null);

  useEffect(() => {
    void apiGet<VolunteeringHome>('/members/me/volunteering').then((result) => {
      if (result.success && result.data) setData(result.data);
      else {
        setData({
          profile: null,
          skills: [],
          teams: [],
          upcoming: [],
          hoursMinutes: 0,
          training: [],
          requests: [],
          participation: null,
          applications: [],
        });
      }
    });
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Volunteering</h1>
          <p className="text-sm text-muted-foreground">
            Ministries, assignments, availability, training, and service hours.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/member/volunteering/apply">Apply</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/member/volunteering/assignments">Assignments</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/member/volunteering/availability">Availability</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/member/volunteering/calendar">Calendar</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/member/volunteering/history">History</Link>
          </Button>
        </div>
      </div>

      {!data ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader>
                <CardDescription>Volunteer status</CardDescription>
                <CardTitle>
                  {data.profile ? (
                    <Badge variant="secondary">{data.profile.statusLabel}</Badge>
                  ) : (
                    'Not registered'
                  )}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Upcoming</CardDescription>
                <CardTitle>{data.upcoming?.length ?? 0}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Service minutes</CardDescription>
                <CardTitle>{data.hoursMinutes ?? 0}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Completed / confirmed</CardDescription>
                <CardTitle>
                  {data.participation
                    ? `${data.participation.completedAssignments}/${data.participation.confirmedAssignments + data.participation.completedAssignments}`
                    : '—'}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Teams</CardTitle>
              <CardDescription>Teams you belong to</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {data.teams.length === 0 ? (
                <p className="text-muted-foreground">You are not on a ministry team yet.</p>
              ) : (
                data.teams.map((row) => (
                  <p key={row.id}>
                    {row.team.name}
                    {row.team.ministry?.name ? ` · ${row.team.ministry.name}` : ''}
                    {row.roleLabel ? ` · ${row.roleLabel}` : ''}
                  </p>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Training</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {(data.training || []).length === 0 ? (
                <p className="text-muted-foreground">No training enrollments.</p>
              ) : (
                data.training.map((row) => (
                  <p key={row.id}>
                    {row.program} · {row.session} · {row.statusLabel}
                  </p>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Applications & requests</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {(data.applications || []).length === 0 && (data.requests || []).length === 0 ? (
                <p className="text-muted-foreground">No applications or requests yet.</p>
              ) : null}
              {(data.applications || []).map((row) => (
                <div key={row.id} className="border-b py-2 last:border-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">
                      {row.ministry?.name || row.preferredMinistry || 'Volunteer application'}
                    </p>
                    <Badge variant="secondary">{row.statusLabel}</Badge>
                  </div>
                  {row.reviewerMessage ? (
                    <p className="mt-1 text-muted-foreground">{row.reviewerMessage}</p>
                  ) : null}
                </div>
              ))}
              {(data.requests || []).map((row) => (
                <p key={row.id}>
                  Request · {row.type} · {row.status}
                </p>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Upcoming service</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {(data.upcoming || []).length === 0 ? (
                <p className="text-muted-foreground">No upcoming assignments.</p>
              ) : (
                data.upcoming.map((row) => (
                  <p key={row.id}>
                    {new Date(row.scheduledAt).toLocaleString()} · {row.roleName}
                    {row.event?.title ? ` · ${row.event.title}` : ''} · {row.statusLabel}
                  </p>
                ))
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
