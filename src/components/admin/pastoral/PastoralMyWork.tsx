'use client';

import { useEffect, useMemo, useState } from 'react';
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

interface CaseRow {
  id: string;
  title: string;
  statusLabel: string;
  priorityLabel: string;
  updatedAt: string;
  assignedToId: string | null;
  member: { id: string; name: string } | null;
}

interface VisitRow {
  id: string;
  scheduledAt: string;
  statusLabel: string;
  locationLabel: string;
  assignedToId: string | null;
  member: { id: string; name: string } | null;
}

interface FollowUpRow {
  id: string;
  task: string;
  dueDate: string | null;
  statusLabel: string;
  assignedToId: string | null;
  caseId: string | null;
}

interface OverviewData {
  counts: {
    openCases: number;
    upcomingVisits: number;
    overdueFollowUps: number;
  };
  recentCases: CaseRow[];
  nextVisits: VisitRow[];
  dueFollowUps: FollowUpRow[];
}

export function PastoralMyWork() {
  const { user } = useAuth();
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    void Promise.all([
      apiGet<OverviewData>('/admin/pastoral/overview'),
      apiGet<CaseRow[]>('/admin/pastoral/cases', {
        assignedTo: user.id,
        pageSize: '20',
      }),
    ]).then(([overviewResult, casesResult]) => {
      if (!overviewResult.success || !overviewResult.data) {
        setError(overviewResult.message);
        return;
      }
      setOverview(overviewResult.data);
      setCases(casesResult.data || []);
    });
  }, [user?.id]);

  const myVisits = useMemo(() => {
    if (!overview || !user?.id) return [];
    return overview.nextVisits.filter((row) => row.assignedToId === user.id);
  }, [overview, user?.id]);

  const myFollowUps = useMemo(() => {
    if (!overview || !user?.id) return [];
    return overview.dueFollowUps.filter((row) => row.assignedToId === user.id);
  }, [overview, user?.id]);

  if (error) return <ApiErrorAlert message={error} />;
  if (!overview) return <Skeleton className="h-72 w-full" />;

  return (
    <PermissionGate permission="pastoral.view">
      <div className="space-y-6">
        <PageHeader
          title="My pastoral work"
          description="Cases, visits, and follow-ups assigned to you."
          actions={
            <Button asChild variant="outline">
              <Link href="/admin/pastoral-care">Dashboard</Link>
            </Button>
          }
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader>
              <CardDescription>My cases</CardDescription>
              <CardTitle className="text-3xl">{cases.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>My upcoming visits</CardDescription>
              <CardTitle className="text-3xl">{myVisits.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>My follow-ups</CardDescription>
              <CardTitle className="text-3xl">{myFollowUps.length}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Assigned cases</CardTitle>
            <CardDescription>Filtered with assignedTo for your user id.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {cases.length === 0 ? (
              <p className="text-sm text-muted-foreground">No cases assigned to you.</p>
            ) : (
              cases.map((row) => (
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

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>My upcoming visits</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {myVisits.length === 0 ? (
                <p className="text-muted-foreground">None scheduled for you in the overview list.</p>
              ) : (
                myVisits.map((row) => (
                  <p key={row.id}>
                    {row.member?.name || 'Member'} · {new Date(row.scheduledAt).toLocaleString()} ·{' '}
                    {row.locationLabel} · {row.statusLabel}
                  </p>
                ))
              )}
              <Button asChild variant="outline" size="sm" className="mt-2">
                <Link href="/admin/pastoral-care/visits">All visits</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>My follow-ups</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {myFollowUps.length === 0 ? (
                <p className="text-muted-foreground">No follow-ups assigned to you in the overview list.</p>
              ) : (
                myFollowUps.map((row) => (
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
      </div>
    </PermissionGate>
  );
}
