'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api/client';
import { PageHeader } from '@/components/admin/PageHeader';
import { PermissionGate } from '@/components/admin/PermissionGate';
import { ApiErrorAlert } from '@/components/admin/ApiErrorAlert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface ReportBucket {
  status?: string;
  label?: string;
  count: number;
}

interface ReportsData {
  range?: { from: string; to: string };
  totals: {
    volunteers?: number;
    applications?: number;
    teams?: number;
    assignments?: number;
    trainings?: number;
    serviceHoursMinutes?: number;
    substitutions?: number;
    openApplications?: number;
  };
  volunteersByStatus?: ReportBucket[];
  applicationsByStatus?: ReportBucket[];
  assignmentsByStatus?: ReportBucket[];
}

export function MinistryReports() {
  const [data, setData] = useState<ReportsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  function load(nextFrom = from, nextTo = to) {
    const params: Record<string, string> = {};
    if (nextFrom) params.from = nextFrom;
    if (nextTo) params.to = nextTo;
    void apiGet<ReportsData>('/admin/ministry/reports', params).then((result) => {
      if (!result.success || !result.data) {
        setError(result.message);
        return;
      }
      setError(null);
      setData(result.data);
    });
  }

  useEffect(() => {
    load();
  }, []);

  if (error && !data) return <ApiErrorAlert message={error} />;
  if (!data) return <Skeleton className="h-72 w-full" />;

  return (
    <PermissionGate permission="ministries.view">
      <div className="space-y-6">
        <PageHeader
          title="Ministry reports"
          description="Aggregates for volunteers, applications, teams, and assignments. No private notes."
          actions={
            <Button asChild variant="outline">
              <Link href="/admin/ministry/teams">Teams</Link>
            </Button>
          }
        />

        <Card>
          <CardHeader>
            <CardTitle>Date range</CardTitle>
            <CardDescription>
              {data.range
                ? `${new Date(data.range.from).toLocaleDateString()} – ${new Date(data.range.to).toLocaleDateString()}`
                : 'Default range'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="space-y-2">
              <Label htmlFor="ministry-report-from">From</Label>
              <Input
                id="ministry-report-from"
                type="date"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ministry-report-to">To</Label>
              <Input
                id="ministry-report-to"
                type="date"
                value={to}
                onChange={(event) => setTo(event.target.value)}
              />
            </div>
            <Button type="button" onClick={() => load(from, to)}>
              Apply
            </Button>
          </CardContent>
        </Card>

        {error ? <ApiErrorAlert message={error} /> : null}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader>
              <CardDescription>Volunteers</CardDescription>
              <CardTitle className="text-3xl">{data.totals.volunteers ?? 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Applications</CardDescription>
              <CardTitle className="text-3xl">{data.totals.applications ?? 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Teams</CardDescription>
              <CardTitle className="text-3xl">{data.totals.teams ?? 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Assignments</CardDescription>
              <CardTitle className="text-3xl">{data.totals.assignments ?? 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Service minutes</CardDescription>
              <CardTitle className="text-3xl">{data.totals.serviceHoursMinutes ?? 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Substitutions</CardDescription>
              <CardTitle className="text-3xl">{data.totals.substitutions ?? 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Open applications</CardDescription>
              <CardTitle className="text-3xl">{data.totals.openApplications ?? 0}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <BucketCard title="Volunteers by status" rows={data.volunteersByStatus || []} />
          <BucketCard title="Applications by status" rows={data.applicationsByStatus || []} />
          <BucketCard title="Assignments by status" rows={data.assignmentsByStatus || []} />
        </div>
      </div>
    </PermissionGate>
  );
}

function BucketCard({ title, rows }: { title: string; rows: ReportBucket[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {rows.length === 0 ? (
          <p className="text-muted-foreground">No data.</p>
        ) : (
          rows.map((row) => (
            <div key={row.status || row.label || String(row.count)} className="flex justify-between gap-2">
              <span className="text-muted-foreground">
                {row.label || (row.status ? row.status.replace(/_/g, ' ') : '—')}
              </span>
              <span className="font-medium">{row.count}</span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
