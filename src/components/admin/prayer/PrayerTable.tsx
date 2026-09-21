'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
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
import { adminStatusLabel } from '@/lib/prayer/status';

interface PrayerRow {
  id: string;
  title: string;
  visibility: string;
  status: string;
  publicApproved: boolean;
  createdAt: string;
  updatedAt: string;
  category: { name: string } | null;
  assignedTo: { id: string; name: string | null } | null;
}

function statusVariant(status: string) {
  if (status === 'rejected') return 'destructive' as const;
  if (status === 'answered') return 'default' as const;
  if (status === 'archived') return 'outline' as const;
  return 'secondary' as const;
}

export function PrayerTable({ initialStatus }: { initialStatus?: string }) {
  const { can } = useAuth();
  const [rows, setRows] = useState<PrayerRow[]>([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState(initialStatus || 'all');
  const [visibility, setVisibility] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState('updatedAt');
  const [dir, setDir] = useState<'asc' | 'desc'>('desc');

  const archivedView = initialStatus === 'archived';

  const params = useMemo(() => {
    const next: Record<string, string> = {
      page: String(page),
      pageSize: '20',
      sort,
      dir,
    };
    if (q) next.q = q;
    if (status !== 'all') next.status = status;
    if (visibility !== 'all') next.visibility = visibility;
    return next;
  }, [q, status, visibility, page, sort, dir]);

  function load() {
    setLoading(true);
    void apiGet<PrayerRow[]>('/admin/prayer', params).then((result) => {
      setRows(result.data || []);
      setTotal(result.pagination?.totalItems || 0);
      setError(result.success ? null : result.message);
      setLoading(false);
    });
  }

  useEffect(() => {
    const handle = setTimeout(load, 200);
    return () => clearTimeout(handle);
  }, [params]);

  const columns: AdminColumn<PrayerRow>[] = [
    { key: 'title', header: 'Title', sortable: true, render: (row) => row.title },
    {
      key: 'category',
      header: 'Category',
      hideOnMobile: true,
      render: (row) => row.category?.name || '—',
    },
    {
      key: 'visibility',
      header: 'Visibility',
      render: (row) => (row.visibility === 'public' ? 'Public' : 'Private'),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (row) => <Badge variant={statusVariant(row.status)}>{adminStatusLabel(row.status)}</Badge>,
    },
    {
      key: 'assignedTo',
      header: 'Assigned to',
      hideOnMobile: true,
      render: (row) => row.assignedTo?.name || '—',
    },
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      hideOnMobile: true,
      render: (row) => new Date(row.createdAt).toLocaleDateString(),
    },
    {
      key: 'updatedAt',
      header: 'Updated',
      sortable: true,
      hideOnMobile: true,
      render: (row) => new Date(row.updatedAt).toLocaleDateString(),
    },
  ];

  return (
    <PermissionGate permission="prayer.view">
      <div className="space-y-6">
        <PageHeader
          title={archivedView ? 'Archived prayer requests' : 'Prayer requests'}
          description="Full request text is not shown in this table. Open a request to review it."
        />
        <AdminDataTable
          columns={columns}
          rows={rows}
          getRowId={(row) => row.id}
          loading={loading}
          error={error}
          emptyTitle={archivedView ? 'No archived requests.' : 'No prayer requests yet.'}
          emptyDescription="New submissions appear here for the prayer team. Private requests never appear on the public website."
          search={q}
          onSearchChange={(value) => {
            setPage(1);
            setQ(value);
          }}
          searchPlaceholder="Search titles and categories"
          filters={
            <>
              <Select
                value={status}
                onValueChange={(value) => {
                  setPage(1);
                  setStatus(value);
                }}
              >
                <SelectTrigger className="w-full sm:w-40" aria-label="Filter by status">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="praying">Praying</SelectItem>
                  <SelectItem value="answered">Answered</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={visibility}
                onValueChange={(value) => {
                  setPage(1);
                  setVisibility(value);
                }}
              >
                <SelectTrigger className="w-full sm:w-40" aria-label="Filter by visibility">
                  <SelectValue placeholder="Visibility" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All visibility</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="public">Public</SelectItem>
                </SelectContent>
              </Select>
            </>
          }
          sortKey={sort}
          sortDir={dir}
          onSort={(key) => {
            if (sort === key) {
              setDir((current) => (current === 'asc' ? 'desc' : 'asc'));
            } else {
              setSort(key);
              setDir('desc');
            }
            setPage(1);
          }}
          page={page}
          pageSize={20}
          totalItems={total}
          onPageChange={setPage}
          rowActions={(row) => (
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/prayer/${row.id}`}>Open</Link>
            </Button>
          )}
        />
      </div>
    </PermissionGate>
  );
}
