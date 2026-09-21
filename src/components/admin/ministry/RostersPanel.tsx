'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api/client';
import { PageHeader } from '@/components/admin/PageHeader';
import { PermissionGate } from '@/components/admin/PermissionGate';
import { ApiErrorAlert } from '@/components/admin/ApiErrorAlert';
import { AdminDataTable, type AdminColumn } from '@/components/admin/AdminDataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface RosterAssignment {
  id: string;
  roleName: string;
  status: string;
  statusLabel: string;
  scheduledAt: string;
  endsAt: string | null;
  member: { id: string; name: string } | null;
  team: { id: string; name: string } | null;
  event: { id: string; title: string; startAt?: string | null } | null;
  ministry: { id: string; name: string } | null;
}

export function RostersPanel() {
  const [rows, setRows] = useState<RosterAssignment[]>([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const params = useMemo(() => {
    const next: Record<string, string> = {
      page: String(page),
      pageSize: '50',
    };
    if (from) next.from = from;
    if (to) next.to = to;
    return next;
  }, [from, to, page]);

  function load() {
    setLoading(true);
    void apiGet<RosterAssignment[]>('/admin/ministry/rosters', params).then((result) => {
      setRows(result.data || []);
      setTotal(result.pagination?.totalItems || 0);
      setError(result.success ? null : result.message);
      setLoading(false);
    });
  }

  useEffect(() => {
    load();
  }, [params]);

  const columns: AdminColumn<RosterAssignment>[] = [
    {
      key: 'scheduledAt',
      header: 'When',
      render: (row) => new Date(row.scheduledAt).toLocaleString(),
    },
    {
      key: 'member',
      header: 'Volunteer',
      render: (row) => row.member?.name || '—',
    },
    {
      key: 'roleName',
      header: 'Role',
      render: (row) => row.roleName,
    },
    {
      key: 'event',
      header: 'Event',
      hideOnMobile: true,
      render: (row) => row.event?.title || '—',
    },
    {
      key: 'ministry',
      header: 'Ministry',
      hideOnMobile: true,
      render: (row) => row.ministry?.name || row.team?.name || '—',
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge variant="secondary">{row.statusLabel}</Badge>,
    },
  ];

  return (
    <PermissionGate permission="ministries.view">
      <div className="space-y-6">
        <PageHeader
          title="Service rosters"
          description="Upcoming proposed, assigned, and confirmed volunteer assignments."
          actions={
            <Button asChild variant="outline">
              <Link href="/admin/ministry/assignments">Assignments</Link>
            </Button>
          }
        />

        <Card>
          <CardHeader>
            <CardTitle>Date range</CardTitle>
            <CardDescription>Leave blank to show the default upcoming window.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="space-y-2">
              <Label htmlFor="roster-from">From</Label>
              <Input
                id="roster-from"
                type="date"
                value={from}
                onChange={(event) => {
                  setFrom(event.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="roster-to">To</Label>
              <Input
                id="roster-to"
                type="date"
                value={to}
                onChange={(event) => {
                  setTo(event.target.value);
                  setPage(1);
                }}
              />
            </div>
            <Button type="button" onClick={() => load()}>
              Apply
            </Button>
          </CardContent>
        </Card>

        {error ? <ApiErrorAlert message={error} /> : null}

        <AdminDataTable
          columns={columns}
          rows={rows}
          getRowId={(row) => row.id}
          loading={loading}
          emptyTitle="No roster entries for this range."
          page={page}
          pageSize={50}
          totalItems={total}
          onPageChange={setPage}
        />
      </div>
    </PermissionGate>
  );
}
