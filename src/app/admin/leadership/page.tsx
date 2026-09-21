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

interface LeaderRow {
  id: string;
  firstName: string;
  lastName: string;
  title: string | null;
  status: string;
  isActive: boolean;
  position: { title: string } | null;
}

export default function LeadershipListPage() {
  const { can } = useAuth();
  const [rows, setRows] = useState<LeaderRow[]>([]);
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
    void apiGet<LeaderRow[]>('/admin/leadership', params).then((result) => {
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
    const result = await apiPost('/admin/leadership/bulk', { action, ids });
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

  const columns: AdminColumn<LeaderRow>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (row) => `${row.firstName} ${row.lastName}`,
    },
    {
      key: 'position',
      header: 'Position',
      hideOnMobile: true,
      render: (row) => row.position?.title || row.title || '—',
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge variant={row.status === 'published' ? 'default' : 'secondary'}>{row.status}</Badge>,
    },
    {
      key: 'isActive',
      header: 'Active',
      hideOnMobile: true,
      render: (row) => (row.isActive ? 'Yes' : 'No'),
    },
  ];

  return (
    <PermissionGate permission="leadership.view">
      <div className="space-y-6">
        <PageHeader
          title="Leaders"
          description="Manage church leadership profiles."
          actions={
            can('leadership.create') ? (
              <Button asChild>
                <Link href="/admin/leadership/create">Add Leader</Link>
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
          emptyTitle="No leaders found."
          emptyDescription="Create the first leadership profile to get started."
          emptyAction={
            can('leadership.create') ? (
              <Button asChild>
                <Link href="/admin/leadership/create">Add Leader</Link>
              </Button>
            ) : null
          }
          search={q}
          onSearchChange={(value) => {
            setPage(1);
            setQ(value);
          }}
          searchPlaceholder="Search leaders"
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
          selectable={can('leadership.update')}
          selectedIds={selected}
          onSelectedChange={setSelected}
          bulkActions={
            can('leadership.update')
              ? [
                  { id: 'activate', label: 'Activate' },
                  { id: 'deactivate', label: 'Deactivate' },
                  { id: 'archive', label: 'Archive', destructive: true },
                ]
              : []
          }
          onBulkAction={(action) => setConfirm({ action, ids: selected })}
          rowActions={(row) =>
            can('leadership.update') ? (
              <Button asChild variant="outline" size="sm">
                <Link href={`/admin/leadership/${row.id}`}>Edit</Link>
              </Button>
            ) : null
          }
        />
        <ConfirmDialog
          open={Boolean(confirm)}
          onOpenChange={(open) => !open && setConfirm(null)}
          title={confirm?.action === 'archive' ? 'Archive selected leaders?' : 'Apply this action?'}
          description={
            confirm?.action === 'archive'
              ? 'Archived leaders are hidden from public pages. This can be reversed later.'
              : 'This will update all selected leadership records.'
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
