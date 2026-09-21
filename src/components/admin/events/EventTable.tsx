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
import { formatInTimeZone } from '@/lib/events/timezone';

interface EventRow {
  id: string;
  title: string;
  slug: string;
  status: string;
  isFeatured: boolean;
  startAt: string;
  endAt: string;
  timezone: string;
  updatedAt: string;
  category: { name: string } | null;
  ministry: { name: string } | null;
  location: { name: string } | null;
}

function statusVariant(status: string) {
  if (status === 'published') return 'default' as const;
  if (status === 'cancelled') return 'destructive' as const;
  if (status === 'scheduled') return 'secondary' as const;
  if (status === 'archived') return 'outline' as const;
  return 'secondary' as const;
}

export function EventTable({ initialStatus }: { initialStatus?: string }) {
  const { can } = useAuth();
  const [rows, setRows] = useState<EventRow[]>([]);
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
    return next;
  }, [q, status, page, sort, dir]);

  function load() {
    setLoading(true);
    void apiGet<EventRow[]>('/admin/events', params).then((result) => {
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
    const result = await apiPost('/admin/events/bulk', { action, ids });
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

  const columns: AdminColumn<EventRow>[] = [
    { key: 'title', header: 'Event', sortable: true, render: (row) => row.title },
    {
      key: 'category',
      header: 'Type',
      hideOnMobile: true,
      render: (row) => row.category?.name || '—',
    },
    {
      key: 'ministry',
      header: 'Ministry',
      hideOnMobile: true,
      render: (row) => row.ministry?.name || '—',
    },
    {
      key: 'location',
      header: 'Location',
      hideOnMobile: true,
      render: (row) => row.location?.name || '—',
    },
    {
      key: 'startAt',
      header: 'Start',
      sortable: true,
      render: (row) =>
        formatInTimeZone(row.startAt, row.timezone, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        }),
    },
    {
      key: 'endAt',
      header: 'End',
      sortable: true,
      hideOnMobile: true,
      render: (row) =>
        formatInTimeZone(row.endAt, row.timezone, {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        }),
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
    <PermissionGate permission="events.view">
      <div className="space-y-6">
        <PageHeader
          title={archivedView ? 'Archived Events' : 'Events'}
          description="Manage church events. Drafts and scheduled items stay off the public website until published."
          actions={
            can('events.create') ? (
              <Button asChild>
                <Link href="/admin/events/create">Add event</Link>
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
          emptyTitle={archivedView ? 'No archived events.' : 'No events yet.'}
          emptyDescription="Create a draft first. It will not appear publicly until an authorized user publishes it."
          emptyAction={
            can('events.create') ? (
              <Button asChild>
                <Link href="/admin/events/create">Add event</Link>
              </Button>
            ) : null
          }
          search={q}
          onSearchChange={(value) => {
            setPage(1);
            setQ(value);
          }}
          searchPlaceholder="Search events"
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
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
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
          selectable={can('events.update')}
          selectedIds={selected}
          onSelectedChange={setSelected}
          bulkActions={
            can('events.update')
              ? [
                  ...(can('events.publish') ? [{ id: 'publish', label: 'Publish' }] : []),
                  { id: 'unpublish', label: 'Unpublish' },
                  ...(can('events.cancel') ? [{ id: 'cancel', label: 'Cancel', destructive: true }] : []),
                  ...(can('events.archive')
                    ? [{ id: 'archive', label: 'Archive', destructive: true }]
                    : []),
                ]
              : []
          }
          onBulkAction={(action) => setConfirm({ action, ids: selected })}
          rowActions={(row) => (
            <div className="flex flex-wrap gap-2">
              {can('events.update') ? (
                <Button asChild variant="outline" size="sm">
                  <Link href={`/admin/events/${row.id}`}>Edit</Link>
                </Button>
              ) : null}
              <Button asChild variant="outline" size="sm">
                <Link href={`/admin/events/${row.id}/registrations`}>Registrations</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href={`/admin/events/${row.id}/preview`}>Preview</Link>
              </Button>
            </div>
          )}
        />
        <ConfirmDialog
          open={Boolean(confirm)}
          onOpenChange={(open) => !open && setConfirm(null)}
          title={
            confirm?.action === 'archive'
              ? 'Archive selected events?'
              : confirm?.action === 'cancel'
                ? 'Cancel selected events?'
                : confirm?.action === 'publish'
                  ? 'Publish selected events?'
                  : 'Apply this action?'
          }
          description={
            confirm?.action === 'archive'
              ? 'Archived events leave upcoming public lists but remain in church records.'
              : confirm?.action === 'cancel'
                ? 'Cancelled events stay visible with a CANCELLED label. They are not deleted.'
                : 'This updates the selected events.'
          }
          confirmLabel="Continue"
          destructive={confirm?.action === 'archive' || confirm?.action === 'cancel'}
          loading={pending}
          onConfirm={() => confirm && runBulk(confirm.action, confirm.ids)}
        />
      </div>
    </PermissionGate>
  );
}
