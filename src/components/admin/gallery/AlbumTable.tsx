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

interface AlbumRow {
  id: string;
  title: string;
  slug: string;
  status: string;
  isFeatured: boolean;
  mediaCount: number;
  updatedAt: string;
  category: { name: string } | null;
  event: { title: string } | null;
  ministry: { name: string } | null;
}

function statusVariant(status: string) {
  if (status === 'published') return 'default' as const;
  if (status === 'archived') return 'outline' as const;
  return 'secondary' as const;
}

export function AlbumTable({ initialStatus }: { initialStatus?: string }) {
  const { can } = useAuth();
  const [rows, setRows] = useState<AlbumRow[]>([]);
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
    const next: Record<string, string> = { page: String(page), pageSize: '20', sort, dir };
    if (q) next.q = q;
    if (status !== 'all') next.status = status;
    return next;
  }, [q, status, page, sort, dir]);

  function load() {
    setLoading(true);
    void apiGet<AlbumRow[]>('/admin/gallery/albums', params).then((result) => {
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
    const result = await apiPost('/admin/gallery/albums/bulk', { action, ids });
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

  const columns: AdminColumn<AlbumRow>[] = [
    { key: 'title', header: 'Album', sortable: true, render: (row) => row.title },
    { key: 'category', header: 'Category', hideOnMobile: true, render: (row) => row.category?.name || '—' },
    { key: 'event', header: 'Event', hideOnMobile: true, render: (row) => row.event?.title || '—' },
    { key: 'ministry', header: 'Ministry', hideOnMobile: true, render: (row) => row.ministry?.name || '—' },
    { key: 'mediaCount', header: 'Media Count', hideOnMobile: true, render: (row) => String(row.mediaCount || 0) },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (row) => <Badge variant={statusVariant(row.status)}>{row.status}</Badge>,
    },
    { key: 'isFeatured', header: 'Featured', hideOnMobile: true, render: (row) => (row.isFeatured ? 'Yes' : '—') },
    {
      key: 'updatedAt',
      header: 'Updated',
      sortable: true,
      hideOnMobile: true,
      render: (row) => new Date(row.updatedAt).toLocaleDateString(),
    },
  ];

  return (
    <PermissionGate permission="gallery.view">
      <div className="space-y-6">
        <PageHeader
          title={archivedView ? 'Archived albums' : 'Gallery albums'}
          description="Draft albums never appear on the public website. Do not publish photos until they have been reviewed."
          actions={
            can('gallery.create') ? (
              <Button asChild>
                <Link href="/admin/gallery/albums/create">Add album</Link>
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
          emptyTitle={archivedView ? 'No archived albums.' : 'No gallery albums yet.'}
          emptyDescription="Create a draft album first. Uploaded photos stay unpublished until an authorized user reviews them."
          emptyAction={
            can('gallery.create') ? (
              <Button asChild>
                <Link href="/admin/gallery/albums/create">Add album</Link>
              </Button>
            ) : null
          }
          search={q}
          onSearchChange={(value) => {
            setPage(1);
            setQ(value);
          }}
          searchPlaceholder="Search albums"
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
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          }
          sortKey={sort}
          sortDir={dir}
          onSort={(key) => {
            if (sort === key) setDir((current) => (current === 'asc' ? 'desc' : 'asc'));
            else {
              setSort(key);
              setDir('desc');
            }
            setPage(1);
          }}
          page={page}
          pageSize={20}
          totalItems={total}
          onPageChange={setPage}
          selectable={can('gallery.update')}
          selectedIds={selected}
          onSelectedChange={setSelected}
          bulkActions={
            can('gallery.update')
              ? [
                  ...(can('gallery.publish') ? [{ id: 'publish', label: 'Publish' }] : []),
                  { id: 'unpublish', label: 'Unpublish' },
                  ...(can('gallery.archive') ? [{ id: 'archive', label: 'Archive', destructive: true }] : []),
                ]
              : []
          }
          onBulkAction={(action) => setConfirm({ action, ids: selected })}
          rowActions={(row) => (
            <div className="flex flex-wrap gap-2">
              {can('gallery.update') ? (
                <Button asChild variant="outline" size="sm">
                  <Link href={`/admin/gallery/albums/${row.id}`}>Edit</Link>
                </Button>
              ) : null}
              <Button asChild variant="ghost" size="sm">
                <Link href={`/admin/gallery/albums/${row.id}/preview`}>Preview</Link>
              </Button>
            </div>
          )}
        />
        <ConfirmDialog
          open={Boolean(confirm)}
          onOpenChange={(open) => !open && setConfirm(null)}
          title={
            confirm?.action === 'archive'
              ? 'Archive selected albums?'
              : confirm?.action === 'publish'
                ? 'Publish selected albums?'
                : 'Apply this action?'
          }
          description="Draft and unpublished media still will not appear publicly. Confirm that published albums are appropriate for the church website."
          confirmLabel="Continue"
          destructive={confirm?.action === 'archive'}
          loading={pending}
          onConfirm={() => confirm && runBulk(confirm.action, confirm.ids)}
        />
      </div>
    </PermissionGate>
  );
}
