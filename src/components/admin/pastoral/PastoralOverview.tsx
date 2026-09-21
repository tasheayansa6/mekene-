'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api/client';
import { useAuth } from '@/components/providers/AuthProvider';
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

interface PastoralCaseRow {
  id: string;
  title: string;
  statusLabel: string;
  priorityLabel: string;
  updatedAt: string;
  member: { id: string; name: string } | null;
  assignedTo: { id: string; name: string | null } | null;
}

interface PastoralVisitRow {
  id: string;
  scheduledAt: string;
  statusLabel: string;
  locationLabel: string;
  member: { id: string; name: string } | null;
}

interface PastoralFollowUpRow {
  id: string;
  task: string;
  dueDate: string | null;
  statusLabel: string;
  caseId: string | null;
}

interface OverviewData {
  counts: {
    openCases: number;
    highPriority: number;
    upcomingVisits: number;
    overdueFollowUps: number;
  };
  recentCases: PastoralCaseRow[];
  nextVisits: PastoralVisitRow[];
  dueFollowUps: PastoralFollowUpRow[];
}

export function PastoralOverview() {
  const { user } = useAuth();
  const [data, setData] = useState<OverviewData | null>(null);
  const [assignedToMe, setAssignedToMe] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([
      apiGet<OverviewData>('/admin/pastoral/overview'),
      user?.id
        ? apiGet<PastoralCaseRow[]>('/admin/pastoral/cases', {
            assignedTo: user.id,
            pageSize: '1',
          })
        : Promise.resolve(null),
    ]).then(([overview, assigned]) => {
      if (!overview.success || !overview.data) {
        setError(overview.message);
        return;
      }
      setData(overview.data);
      setAssignedToMe(assigned?.pagination?.totalItems || 0);
    });
  }, [user?.id]);

  if (error) return <ApiErrorAlert message={error} />;
  if (!data) return <Skeleton className="h-72 w-full" />;

  return (
    <PermissionGate permission="pastoral.view">
      <div className="space-y-6">
        <PageHeader
          title="Pastoral care"
          description="Confidential care cases, visits, and follow-ups. Note content is never shown on this overview."
          actions={
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href="/admin/pastoral-care/cases">Cases</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/admin/pastoral-care/my-work">My work</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/admin/pastoral-care/visits">Visits</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/admin/pastoral-care/reports">Reports</Link>
              </Button>
            </div>
          }
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader>
              <CardDescription>Open cases</CardDescription>
              <CardTitle className="text-3xl">{data.counts.openCases}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Assigned to me</CardDescription>
              <CardTitle className="text-3xl">{assignedToMe}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Upcoming visits</CardDescription>
              <CardTitle className="text-3xl">{data.counts.upcomingVisits}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Overdue follow-ups</CardDescription>
              <CardTitle className="text-3xl">{data.counts.overdueFollowUps}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent cases</CardTitle>
              <CardDescription>Titles and status only.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.recentCases.length === 0 ? (
                <p className="text-sm text-muted-foreground">No cases yet.</p>
              ) : (
                data.recentCases.map((row) => (
                  <div
                    key={row.id}
                    className="flex flex-col gap-2 border-b py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <Link
                        className="font-medium hover:underline"
                        href={`/admin/pastoral-care/cases/${row.id}`}
                      >
                        {row.title}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {row.member?.name || 'Member'} ·{' '}
                        {new Date(row.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">{row.statusLabel}</Badge>
                      <Badge variant="outline">{row.priorityLabel}</Badge>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Next visits</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.nextVisits.length === 0 ? (
                <p className="text-sm text-muted-foreground">No upcoming visits.</p>
              ) : (
                data.nextVisits.map((row) => (
                  <div key={row.id} className="border-b py-3 text-sm last:border-0">
                    <p className="font-medium">{row.member?.name || 'Member'}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(row.scheduledAt).toLocaleString()} · {row.locationLabel} ·{' '}
                      {row.statusLabel}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Due follow-ups</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data.dueFollowUps.length === 0 ? (
              <p className="text-muted-foreground">No open follow-ups.</p>
            ) : (
              data.dueFollowUps.map((row) => (
                <p key={row.id}>
                  {row.task}
                  {row.dueDate ? ` · due ${new Date(row.dueDate).toLocaleDateString()}` : ''} ·{' '}
                  {row.statusLabel}
                  {row.caseId ? (
                    <>
                      {' · '}
                      <Link
                        className="underline"
                        href={`/admin/pastoral-care/cases/${row.caseId}`}
                      >
                        Case
                      </Link>
                    </>
                  ) : null}
                </p>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </PermissionGate>
  );
}
