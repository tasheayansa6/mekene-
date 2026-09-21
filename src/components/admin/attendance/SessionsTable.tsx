'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api/client';
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

interface SessionRow {
  id: string;
  title: string;
  sessionTypeLabel: string;
  status: string;
  statusLabel: string;
  startsAt: string;
  recordCount: number;
  ministry: { name: string } | null;
}

export function SessionsTable() {
  const [rows, setRows] = useState<SessionRow[]>([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const params = useMemo(() => {
    const next: Record<string, string> = { page: String(page), pageSize: '20' };
    if (q) next.q = q;
    if (status !== 'all') next.status = status;
    return next;
  }, [q, status, page]);

  useEffect(() => {
    const handle = setTimeout(() => {
      setLoading(true);
      void apiGet<SessionRow[]>('/admin/attendance/sessions', params).then((result) => {
        setRows(result.data || []);
        setTotal(result.pagination?.totalItems || 0);
        setError(result.success ? null : result.message);
        setLoading(false);
      });
    }, 200);
    return () => clearTimeout(handle);
  }, [params]);

  const columns: AdminColumn<SessionRow>[] = [
    { key: 'title', header: 'Session', render: (row) => row.title },
    {
      key: 'sessionType',
      header: 'Type',
      hideOnMobile: true,
      render: (row) => row.sessionTypeLabel,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge variant="secondary">{row.statusLabel}</Badge>,
    },
    {
      key: 'startsAt',
      header: 'Starts',
      render: (row) => new Date(row.startsAt).toLocaleString(),
    },
    {
      key: 'recordCount',
      header: 'Checked in',
      hideOnMobile: true,
      render: (row) => String(row.recordCount),
    },
  ];

  return (
    <PermissionGate permission="attendance.view">
      <div className="space-y-6">
        <PageHeader
          title="Attendance sessions"
          description="Draft → scheduled → open → closed → archived. Only open sessions accept check-ins."
          actions={
            <Button asChild>
              <Link href="/admin/attendance/sessions/create">Create session</Link>
            </Button>
          }
        />
        <AdminDataTable
          columns={columns}
          rows={rows}
          getRowId={(row) => row.id}
          loading={loading}
          error={error}
          emptyTitle="No attendance sessions found."
          search={q}
          onSearchChange={(value) => {
            setQ(value);
            setPage(1);
          }}
          page={page}
          pageSize={20}
          totalItems={total}
          onPageChange={setPage}
          filters={
            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-40" aria-label="Filter by status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          }
          rowActions={(row) => (
            <Button asChild size="sm" variant="outline">
              <Link href={`/admin/attendance/sessions/${row.id}`}>Open</Link>
            </Button>
          )}
        />
      </div>
    </PermissionGate>
  );
}
