'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { apiGet, apiPost } from '@/lib/api/client';
import { useAuth } from '@/components/providers/AuthProvider';
import { PageHeader } from '@/components/admin/PageHeader';
import { PermissionGate } from '@/components/admin/PermissionGate';
import { AdminDataTable, type AdminColumn } from '@/components/admin/AdminDataTable';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { publicErrorMessage } from '@/lib/admin/http-error';

interface SermonRow {
  id: string;
  title: string;
  slug: string;
  status: string;
  isFeatured: boolean;
  sermonDate: string;
  updatedAt: string;
  speakerName: string | null;
  series: { name: string } | null;
  category: { name: string } | null;
}

function statusVariant(status: string) {
  if (status === 'published') return 'default' as const;
  if (status === 'scheduled') return 'secondary' as const;
  if (status === 'archived') return 'outline' as const;
  return 'secondary' as const;
}

export function SermonTable({
  initialStatus,
  initialContentType,
}: {
  initialStatus?: string;
  initialContentType?: string;
}) {
  const { can } = useAuth();
  const [rows, setRows] = useState<SermonRow[]>([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState(initialStatus || 'all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [confirm, setConfirm] = useState<{ action: string; ids: string[] } | null>(null);
  const [pending, setPending] = useState(false);
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
    if (initialContentType) next.contentType = initialContentType;
    return next;
  }, [q, status, page, sort, dir, initialContentType]);

  function load() {
    setLoading(true);
    void apiGet<SermonRow[]>('/admin/sermons', params).then((result) => {
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

  async function runBulk(action: string, ids: string[]) {
    setPending(true);
    const result = await apiPost('/admin/sermons/bulk', { action, ids });
    setPending(false);
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    toast.success(result.message || 'Updated.');
    setConfirm(null);
    setSelected([]);
    load();
  }

  const columns: AdminColumn<SermonRow>[] = [
    { key: 'title', header: 'Title', sortable: true, render: (row) => row.title },
    {
      key: 'speaker',
      header: 'Speaker',
      hideOnMobile: true,
      render: (row) => row.speakerName || '—',
    },
    {
      key: 'series',
      header: 'Series',
      hideOnMobile: true,
      render: (row) => row.series?.name || '—',
    },
    {
      key: 'category',
      header: 'Category',
      hideOnMobile: true,
      render: (row) => row.category?.name || '—',
    },
    {
      key: 'sermonDate',
      header: 'Date',
      sortable: true,
      render: (row) => new Date(row.sermonDate).toLocaleDateString(),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (row) => <Badge variant={statusVariant(row.status)}>{row.status}</Badge>,
    },
    {
      key: 'isFeatured',
      header: 'Featured',
      hideOnMobile: true,
      render: (row) => (row.isFeatured ? 'Yes' : '—'),
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
    <PermissionGate permission="sermons.view">
      <div className="space-y-6">
        <PageHeader
          title={archivedView ? 'Archived Sermons' : 'Sermons'}
          description="Manage sermon library records. Drafts, scheduled items, and archived sermons stay off the public website."
          actions={
            can('sermons.create') ? (
              <Button asChild>
                <Link href="/admin/sermons/create">Add sermon</Link>
              </Button>
            ) : null
          }
        />
        <AdminDataTable
          columns={columns}
          rows={rows}
          getRowId={(row) => row.id}
          loading={loading}
          error={error}
          emptyTitle={archivedView ? 'No archived sermons.' : 'No sermons yet.'}
          emptyDescription="Create a draft first. It will not appear publicly until an authorized user publishes it."
          emptyAction={
            can('sermons.create') ? (
              <Button asChild>
                <Link href="/admin/sermons/create">Add sermon</Link>
              </Button>
            ) : null
          }
          search={q}
          onSearchChange={(value) => {
            setPage(1);
            setQ(value);
          }}
          searchPlaceholder="Search sermons"
          filters={
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
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="review">Review</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
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
          selectable={can('sermons.update')}
          selectedIds={selected}
          onSelectedChange={setSelected}
          bulkActions={
            can('sermons.update')
              ? [
                  ...(can('sermons.publish') ? [{ id: 'publish', label: 'Publish' }] : []),
                  { id: 'unpublish', label: 'Unpublish' },
                  ...(can('sermons.archive')
                    ? [{ id: 'archive', label: 'Archive', destructive: true }]
                    : []),
                ]
              : []
          }
          onBulkAction={(action) => setConfirm({ action, ids: selected })}
          rowActions={(row) => (
            <div className="flex flex-wrap gap-2">
              {can('sermons.update') ? (
                <Button asChild variant="outline" size="sm">
                  <Link href={`/admin/sermons/${row.id}`}>Edit</Link>
                </Button>
              ) : null}
              <Button asChild variant="ghost" size="sm">
                <Link href={`/admin/sermons/${row.id}/preview`}>Preview</Link>
              </Button>
            </div>
          )}
        />
        <ConfirmDialog
          open={Boolean(confirm)}
          onOpenChange={(open) => !open && setConfirm(null)}
          title={
            confirm?.action === 'archive'
              ? 'Archive selected sermons?'
              : confirm?.action === 'publish'
                ? 'Publish selected sermons?'
                : 'Apply this action?'
          }
          description={
            confirm?.action === 'archive'
              ? 'Archived sermons are hidden from the public library but kept for church records.'
              : confirm?.action === 'publish'
                ? 'Published sermons become visible in the public sermon library.'
                : 'This will update all selected records.'
          }
          confirmLabel="Continue"
          destructive={confirm?.action === 'archive'}
          loading={pending}
          onConfirm={() => confirm && runBulk(confirm.action, confirm.ids)}
        />
      </div>
    </PermissionGate>
  );
}
