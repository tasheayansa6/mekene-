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

interface MinistryRow {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  status: string;
  isActive: boolean;
  leaderName: string | null;
}

export default function MinistriesListPage() {
  const { can } = useAuth();
  const [rows, setRows] = useState<MinistryRow[]>([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [confirm, setConfirm] = useState<{ action: string; ids: string[] } | null>(null);
  const [pending, setPending] = useState(false);

  const params = useMemo(() => {
    const next: Record<string, string> = { page: String(page), pageSize: '20' };
    if (q) next.q = q;
    if (status !== 'all') next.status = status;
    return next;
  }, [q, status, page]);

  function load() {
    setLoading(true);
    void apiGet<MinistryRow[]>('/admin/ministries', params).then((result) => {
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
    const result = await apiPost('/admin/ministries/bulk', { action, ids });
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

  const columns: AdminColumn<MinistryRow>[] = [
    { key: 'name', header: 'Name' },
    { key: 'category', header: 'Category', hideOnMobile: true, render: (row) => row.category || '—' },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge variant={row.status === 'published' ? 'default' : 'secondary'}>{row.status}</Badge>
      ),
    },
    { key: 'leaderName', header: 'Leader', hideOnMobile: true, render: (row) => row.leaderName || '—' },
  ];

  return (
    <PermissionGate permission="ministries.view">
      <div className="space-y-6">
        <PageHeader
          title="Ministries"
          description="Manage church ministries. Ministry leaders only see ministries assigned to them."
          actions={
            can('ministries.create') ? (
              <Button asChild>
                <Link href="/admin/ministries/create">Add Ministry</Link>
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
          emptyTitle="No ministries found."
          emptyDescription="Create your first ministry to get started."
          emptyAction={
            can('ministries.create') ? (
              <Button asChild>
                <Link href="/admin/ministries/create">Add Ministry</Link>
              </Button>
            ) : null
          }
          search={q}
          onSearchChange={(value) => {
            setPage(1);
            setQ(value);
          }}
          searchPlaceholder="Search ministries"
          filters={
            <Select
              value={status}
              onValueChange={(value) => {
                setPage(1);
                setStatus(value);
              }}
            >
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          }
          page={page}
          pageSize={20}
          totalItems={total}
          onPageChange={setPage}
          selectable={can('ministries.update')}
          selectedIds={selected}
          onSelectedChange={setSelected}
          bulkActions={
            can('ministries.update')
              ? [
                  { id: 'publish', label: 'Publish' },
                  { id: 'unpublish', label: 'Unpublish' },
                  { id: 'activate', label: 'Activate' },
                  { id: 'deactivate', label: 'Deactivate' },
                  { id: 'archive', label: 'Archive', destructive: true },
                ]
              : []
          }
          onBulkAction={(action) => setConfirm({ action, ids: selected })}
          rowActions={(row) => (
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/ministries/${row.id}`}>
                {can('ministries.update') ? 'Edit' : 'View'}
              </Link>
            </Button>
          )}
        />
        <ConfirmDialog
          open={Boolean(confirm)}
          onOpenChange={(open) => !open && setConfirm(null)}
          title={
            confirm?.action === 'archive'
              ? 'Archive selected ministries?'
              : confirm?.action === 'delete'
                ? 'Delete selected ministries?'
                : 'Apply this action?'
          }
          description={
            confirm?.action === 'archive' || confirm?.action === 'delete'
              ? 'This action cannot be easily undone.'
              : 'This will update all selected ministries.'
          }
          confirmLabel={confirm?.action === 'delete' ? 'Delete' : 'Continue'}
          destructive={confirm?.action === 'archive' || confirm?.action === 'delete'}
          loading={pending}
          onConfirm={() => confirm && runBulk(confirm.action, confirm.ids)}
        />
      </div>
    </PermissionGate>
  );
}
