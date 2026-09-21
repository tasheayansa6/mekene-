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

interface ApplicationRow {
  id: string;
  applicant: { id: string; name: string };
  submittedAt: string;
  status: string;
  statusLabel: string;
  reviewedBy: { id: string; name: string } | null;
  updatedAt: string;
}

export function ApplicationsTable({
  initialPending,
}: {
  initialPending?: boolean;
}) {
  const [rows, setRows] = useState<ApplicationRow[]>([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState(initialPending ? 'pending' : 'all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const params = useMemo(() => {
    const next: Record<string, string> = { page: String(page), pageSize: '20' };
    if (q) next.q = q;
    if (status === 'pending') next.pending = '1';
    else if (status !== 'all') next.status = status;
    return next;
  }, [q, status, page]);

  useEffect(() => {
    const handle = setTimeout(() => {
      setLoading(true);
      void apiGet<ApplicationRow[]>('/admin/members/applications', params).then((result) => {
        setRows(result.data || []);
        setTotal(result.pagination?.totalItems || 0);
        setError(result.success ? null : result.message);
        setLoading(false);
      });
    }, 200);
    return () => clearTimeout(handle);
  }, [params]);

  const columns: AdminColumn<ApplicationRow>[] = [
    { key: 'applicant', header: 'Applicant', render: (row) => row.applicant.name },
    {
      key: 'submittedAt',
      header: 'Submitted',
      render: (row) => new Date(row.submittedAt).toLocaleDateString(),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge variant="secondary">{row.statusLabel}</Badge>,
    },
    {
      key: 'reviewedBy',
      header: 'Reviewed By',
      hideOnMobile: true,
      render: (row) => row.reviewedBy?.name || '—',
    },
    {
      key: 'updatedAt',
      header: 'Updated',
      hideOnMobile: true,
      render: (row) => new Date(row.updatedAt).toLocaleDateString(),
    },
  ];

  return (
    <PermissionGate permission="members.moderate">
      <div className="space-y-6">
        <PageHeader
          title="Membership applications"
          description="Review applications before creating a church membership record."
        />
        <AdminDataTable
          columns={columns}
          rows={rows}
          getRowId={(row) => row.id}
          loading={loading}
          error={error}
          emptyTitle="No membership applications require review."
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
              <SelectTrigger className="w-48" aria-label="Filter by application status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending review</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="under_review">Under review</SelectItem>
                <SelectItem value="needs_information">Needs information</SelectItem>
                <SelectItem value="resubmitted">Resubmitted</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          }
          rowActions={(row) => (
            <Button asChild size="sm" variant="outline">
              <Link href={`/admin/members/applications/${row.id}`}>Review</Link>
            </Button>
          )}
        />
      </div>
    </PermissionGate>
  );
}
