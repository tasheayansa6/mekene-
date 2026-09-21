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

interface VolunteerRow {
  id: string;
  status: string;
  statusLabel: string;
  joinedAt: string | null;
  experience: string | null;
  member: { id: string; name: string; membershipNumber: string | null } | null;
  updatedAt: string;
}

const VOLUNTEER_STATUSES = [
  'interested',
  'applicant',
  'pending_review',
  'approved',
  'active',
  'temporarily_unavailable',
  'inactive',
  'suspended',
  'archived',
  'former',
] as const;

export function VolunteersTable() {
  const [rows, setRows] = useState<VolunteerRow[]>([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const params = useMemo(() => {
    const next: Record<string, string> = {
      page: String(page),
      pageSize: '20',
    };
    if (q.trim()) next.q = q.trim();
    if (status !== 'all') next.status = status;
    return next;
  }, [page, q, status]);

  useEffect(() => {
    const handle = setTimeout(() => {
      setLoading(true);
      void apiGet<VolunteerRow[]>('/admin/volunteers', params).then((result) => {
        setRows(result.data || []);
        setTotal(result.pagination?.totalItems || 0);
        setError(result.success ? null : result.message);
        setLoading(false);
      });
    }, 150);
    return () => clearTimeout(handle);
  }, [params]);

  const columns: AdminColumn<VolunteerRow>[] = [
    {
      key: 'member',
      header: 'Member',
      render: (row) =>
        row.member ? (
          <Link className="hover:underline" href={`/admin/members/${row.member.id}`}>
            {row.member.name}
          </Link>
        ) : (
          '—'
        ),
    },
    {
      key: 'membershipNumber',
      header: 'Membership #',
      hideOnMobile: true,
      render: (row) => row.member?.membershipNumber || '—',
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge variant="secondary">{row.statusLabel}</Badge>,
    },
    {
      key: 'joinedAt',
      header: 'Joined',
      hideOnMobile: true,
      render: (row) => (row.joinedAt ? new Date(row.joinedAt).toLocaleDateString() : '—'),
    },
    {
      key: 'updatedAt',
      header: 'Updated',
      hideOnMobile: true,
      render: (row) => new Date(row.updatedAt).toLocaleDateString(),
    },
  ];

  return (
    <PermissionGate permission="volunteers.view">
      <div className="space-y-6">
        <PageHeader
          title="Volunteers"
          description="Approved and active volunteer profiles. Applications are reviewed separately."
          actions={
            <Button asChild variant="outline">
              <Link href="/admin/volunteers/applications">Applications</Link>
            </Button>
          }
        />
        <AdminDataTable
          columns={columns}
          rows={rows}
          getRowId={(row) => row.id}
          loading={loading}
          error={error}
          emptyTitle="No volunteer profiles yet."
          emptyDescription="Profiles appear after applications are approved."
          search={q}
          onSearchChange={(value) => {
            setQ(value);
            setPage(1);
          }}
          searchPlaceholder="Search volunteers…"
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
              <SelectTrigger className="w-full sm:w-44" aria-label="Filter by status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {VOLUNTEER_STATUSES.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />
      </div>
    </PermissionGate>
  );
}
