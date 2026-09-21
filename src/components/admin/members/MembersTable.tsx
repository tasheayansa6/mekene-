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

interface MemberRow {
  id: string;
  displayName: string;
  membershipNumber: string | null;
  status: string;
  statusLabel: string;
  household: { id: string; name: string } | null;
  dateJoined: string | null;
  updatedAt: string;
}

function statusVariant(status: string) {
  if (status === 'archived') return 'outline' as const;
  if (status === 'inactive' || status === 'transferred') return 'secondary' as const;
  return 'default' as const;
}

export function MembersTable({ initialStatus }: { initialStatus?: string }) {
  const { can } = useAuth();
  const [rows, setRows] = useState<MemberRow[]>([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState(initialStatus || 'all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState('updatedAt');
  const [dir, setDir] = useState<'asc' | 'desc'>('desc');
  const [selected, setSelected] = useState<string[]>([]);
  const [confirm, setConfirm] = useState<'archive' | 'set_inactive' | null>(null);

  const params = useMemo(() => {
    const next: Record<string, string> = { page: String(page), pageSize: '20', sort, dir };
    if (q) next.q = q;
    if (status !== 'all') next.status = status;
    return next;
  }, [q, status, page, sort, dir]);

  function load() {
    setLoading(true);
    void apiGet<MemberRow[]>('/admin/members', params).then((result) => {
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

  async function runBulk(action: 'archive' | 'set_inactive') {
    const result = await apiPost('/admin/members/bulk', { action, ids: selected });
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    toast.success(result.message || 'Updated.');
    setSelected([]);
    load();
  }

  const columns: AdminColumn<MemberRow>[] = [
    { key: 'displayName', header: 'Member', render: (row) => row.displayName },
    {
      key: 'membershipNumber',
      header: 'Membership Number',
      sortable: true,
      render: (row) => row.membershipNumber || '—',
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (row) => <Badge variant={statusVariant(row.status)}>{row.statusLabel}</Badge>,
    },
    {
      key: 'household',
      header: 'Household',
      hideOnMobile: true,
      render: (row) => row.household?.name || '—',
    },
    {
      key: 'dateJoined',
      header: 'Joined',
      sortable: true,
      hideOnMobile: true,
      render: (row) => (row.dateJoined ? new Date(row.dateJoined).toLocaleDateString() : '—'),
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
    <PermissionGate permission="members.view">
      <div className="space-y-6">
        <PageHeader
          title="Members"
          description="Church membership records are separate from website accounts."
        />
        <AdminDataTable
          columns={columns}
          rows={rows}
          getRowId={(row) => row.id}
          loading={loading}
          error={error}
          emptyTitle="No members found."
          emptyDescription="Approved members will appear here after application review."
          search={q}
          onSearchChange={(value) => {
            setQ(value);
            setPage(1);
          }}
          searchPlaceholder="Search name or membership number"
          sortKey={sort}
          sortDir={dir}
          onSort={(key) => {
            setSort(key);
            setDir((current) => (sort === key && current === 'desc' ? 'asc' : 'desc'));
          }}
          page={page}
          pageSize={20}
          totalItems={total}
          onPageChange={setPage}
          selectable={can('members.update')}
          selectedIds={selected}
          onSelectedChange={setSelected}
          bulkActions={
            can('members.update')
              ? [
                  { id: 'set_inactive', label: 'Set inactive' },
                  ...(can('members.archive') ? [{ id: 'archive', label: 'Archive', destructive: true }] : []),
                ]
              : []
          }
          onBulkAction={(id) => setConfirm(id as 'archive' | 'set_inactive')}
          filters={
            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-40" aria-label="Filter by status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="transferred">Transferred</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          }
          rowActions={(row) => (
            <Button asChild size="sm" variant="outline">
              <Link href={`/admin/members/${row.id}`}>View</Link>
            </Button>
          )}
        />
        <ConfirmDialog
          open={confirm !== null}
          title={confirm === 'archive' ? 'Archive selected members?' : 'Set selected members inactive?'}
          description="This updates membership status. It does not delete website accounts."
          confirmLabel="Confirm"
          onConfirm={() => {
            if (confirm) void runBulk(confirm);
            setConfirm(null);
          }}
          onOpenChange={(open) => {
            if (!open) setConfirm(null);
          }}
        />
      </div>
    </PermissionGate>
  );
}
