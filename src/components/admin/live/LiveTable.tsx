'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { apiGet } from '@/lib/api/client';
import { useAuth } from '@/components/providers/AuthProvider';
import { PageHeader } from '@/components/admin/PageHeader';
import { PermissionGate } from '@/components/admin/PermissionGate';
import { AdminDataTable, type AdminColumn } from '@/components/admin/AdminDataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { formatInTimeZone } from '@/lib/events/timezone';

interface LiveRow {
  id: string;
  title: string;
  slug: string;
  status: string;
  displayStatus: string;
  isLive: boolean;
  scheduledStartAt: string;
  scheduledEndAt: string | null;
  timezone: string;
  visibility: string;
  event: { title: string } | null;
  updatedAt: string;
}

interface AnalyticsOverview {
  liveNow: number;
  scheduled: number;
  endedRecent: number;
  totalSessions: number;
}

function statusFilterOptions() {
  return [
    { value: 'all', label: 'All statuses' },
    { value: 'live', label: 'Live' },
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'paused', label: 'Paused' },
    { value: 'ended', label: 'Ended' },
    { value: 'cancelled', label: 'Cancelled' },
  ];
}

export function LiveTable({ initialStatus }: { initialStatus?: string }) {
  const { can } = useAuth();
  const [rows, setRows] = useState<LiveRow[]>([]);
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState(initialStatus || 'all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState('scheduledStartAt');
  const [dir, setDir] = useState<'asc' | 'desc'>('desc');

  const params = useMemo(() => {
    const next: Record<string, string> = {
      page: String(page),
      pageSize: '20',
      sort,
      dir,
    };
    if (q) next.q = q;
    if (status !== 'all') next.status = status;
    return next;
  }, [q, status, page, sort, dir]);

  function load() {
    setLoading(true);
    void apiGet<LiveRow[]>('/admin/live', params).then((result) => {
      setRows(result.data || []);
      setTotal(result.pagination?.totalItems || 0);
      setError(result.success ? null : result.message);
      setLoading(false);
    });
  }

  useEffect(() => {
    void apiGet<AnalyticsOverview>('/admin/live/analytics').then((result) => {
      if (result.success && result.data) setOverview(result.data);
    });
  }, []);

  useEffect(() => {
    const handle = setTimeout(load, 200);
    return () => clearTimeout(handle);
  }, [params]);

  const columns: AdminColumn<LiveRow>[] = [
    {
      key: 'title',
      header: 'Session',
      sortable: true,
      render: (row) => (
        <Link href={`/admin/live/${row.id}`} className="font-medium hover:underline">
          {row.title}
        </Link>
      ),
    },
    {
      key: 'event',
      header: 'Event',
      hideOnMobile: true,
      render: (row) => row.event?.title || '—',
    },
    {
      key: 'displayStatus',
      header: 'Status',
      render: (row) => <LiveStatusBadge status={row.displayStatus} pulse={row.isLive} />,
    },
    {
      key: 'visibility',
      header: 'Visibility',
      hideOnMobile: true,
      render: (row) => <Badge variant="outline">{row.visibility}</Badge>,
    },
    {
      key: 'scheduledStartAt',
      header: 'Scheduled start',
      sortable: true,
      render: (row) =>
        formatInTimeZone(row.scheduledStartAt, row.timezone, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        }),
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <div className="flex gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href={`/live/${row.slug}`} target="_blank">
              Public
            </Link>
          </Button>
        </div>
      ),
    },
  ];

  return (
    <PermissionGate permission="events.view">
      <div className="space-y-6">
        <PageHeader
          title="Live streaming"
          description="Manage worship live streams, chat moderation, and session analytics."
          actions={
            can('events.create') || can('events.manage') ? (
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline">
                  <Link href="/admin/live/analytics">Analytics</Link>
                </Button>
                <Button asChild>
                  <Link href="/admin/live/create">Create session</Link>
                </Button>
              </div>
            ) : null
          }
        />

        {overview ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Live now</CardDescription>
                <CardTitle className="text-3xl">{overview.liveNow}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Scheduled</CardDescription>
                <CardTitle className="text-3xl">{overview.scheduled}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Ended (30 days)</CardDescription>
                <CardTitle className="text-3xl">{overview.endedRecent}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total sessions</CardDescription>
                <CardTitle className="text-3xl">{overview.totalSessions}</CardTitle>
              </CardHeader>
            </Card>
          </div>
        ) : null}

        <AdminDataTable
          columns={columns}
          rows={rows}
          getRowId={(row) => row.id}
          loading={loading}
          error={error}
          emptyTitle="No live sessions found."
          emptyDescription="Create a live session linked to a worship event."
          emptyAction={
            can('events.create') || can('events.manage') ? (
              <Button asChild>
                <Link href="/admin/live/create">Create session</Link>
              </Button>
            ) : null
          }
          search={q}
          onSearchChange={(value) => {
            setPage(1);
            setQ(value);
          }}
          searchPlaceholder="Search live sessions"
          filters={
            <Select value={status} onValueChange={(value) => { setPage(1); setStatus(value); }}>
              <SelectTrigger className="w-full sm:w-44" aria-label="Filter by status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {statusFilterOptions().map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
          sortKey={sort}
          sortDir={dir}
          onSort={(key) => {
            if (sort === key) setDir(dir === 'asc' ? 'desc' : 'asc');
            else {
              setSort(key);
              setDir('asc');
            }
          }}
          page={page}
          pageSize={20}
          totalItems={total}
          onPageChange={setPage}
        />
      </div>
    </PermissionGate>
  );
}
