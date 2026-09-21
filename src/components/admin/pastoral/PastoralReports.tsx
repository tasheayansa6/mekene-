'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api/client';
import { PageHeader } from '@/components/admin/PageHeader';
import { PermissionGate } from '@/components/admin/PermissionGate';
import { ApiErrorAlert } from '@/components/admin/ApiErrorAlert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

interface ReportBucket {
  status?: string;
  priority?: string;
  label?: string;
  count: number;
}

interface ReportsData {
  range: { from: string; to: string };
  totals: { cases: number; visits: number; followUps: number };
  casesByStatus: ReportBucket[];
  casesByPriority: ReportBucket[];
  visitsByStatus: ReportBucket[];
  followUpsByStatus: ReportBucket[];
}

export function PastoralReports() {
  const [data, setData] = useState<ReportsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  function load(nextFrom = from, nextTo = to) {
    const params: Record<string, string> = {};
    if (nextFrom) params.from = nextFrom;
    if (nextTo) params.to = nextTo;
    void apiGet<ReportsData>('/admin/pastoral/reports', params).then((result) => {
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
    <PermissionGate permission="pastoral.view">
      <div className="space-y-6">
        <PageHeader
          title="Pastoral care reports"
          description="Aggregates only. Note content and case summaries are never included."
          actions={
            <Button asChild variant="outline">
              <Link href="/admin/pastoral-care">Dashboard</Link>
            </Button>
          }
        />

        <Card>
          <CardHeader>
            <CardTitle>Date range</CardTitle>
            <CardDescription>
              Showing {new Date(data.range.from).toLocaleDateString()} –{' '}
              {new Date(data.range.to).toLocaleDateString()}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="space-y-2">
              <Label htmlFor="report-from">From</Label>
              <Input
                id="report-from"
                type="date"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="report-to">To</Label>
              <Input
                id="report-to"
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

        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader>
              <CardDescription>Cases</CardDescription>
              <CardTitle className="text-3xl">{data.totals.cases}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Visits</CardDescription>
              <CardTitle className="text-3xl">{data.totals.visits}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Follow-ups</CardDescription>
              <CardTitle className="text-3xl">{data.totals.followUps}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <BucketCard title="Cases by status" rows={data.casesByStatus} />
          <BucketCard title="Cases by priority" rows={data.casesByPriority} />
          <BucketCard title="Visits by status" rows={data.visitsByStatus} />
          <BucketCard title="Follow-ups by status" rows={data.followUpsByStatus} />
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
          <p className="text-muted-foreground">No data in this range.</p>
        ) : (
          rows.map((row) => (
            <div key={`${row.status || row.priority}-${row.label}`} className="flex justify-between gap-4">
              <span>{row.label || row.status || row.priority}</span>
              <span className="font-medium">{row.count}</span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
