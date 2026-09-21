'use client';

import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api/client';
import { PageHeader } from '@/components/admin/PageHeader';
import { PermissionGate } from '@/components/admin/PermissionGate';
import { AdminDataTable, type AdminColumn } from '@/components/admin/AdminDataTable';

interface LogRow {
  id: string;
  action: string;
  entity: string;
  createdAt: string;
  ipAddress: string | null;
  user: { name: string; email: string } | null;
  details: string | null;
}

export default function AuditLogsPage() {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handle = setTimeout(() => {
      setLoading(true);
      void apiGet<LogRow[]>('/admin/security-logs', {
        page: String(page),
        pageSize: '25',
        ...(q ? { action: q } : {}),
      }).then((result) => {
        setRows(result.data || []);
        setTotal(result.pagination?.totalItems || 0);
        setError(result.success ? null : result.message);
        setLoading(false);
      });
    }, 250);
    return () => clearTimeout(handle);
  }, [q, page]);

  const columns: AdminColumn<LogRow>[] = [
    { key: 'createdAt', header: 'Time', render: (row) => new Date(row.createdAt).toLocaleString() },
    { key: 'action', header: 'Action' },
    { key: 'entity', header: 'Resource', hideOnMobile: true },
    { key: 'user', header: 'User', render: (row) => row.user?.name || '—' },
    { key: 'ipAddress', header: 'IP', hideOnMobile: true, render: (row) => row.ipAddress || '—' },
  ];

  return (
    <PermissionGate permission="security_logs.view">
      <div className="space-y-6">
        <PageHeader
          title="Audit Logs"
          description="Security and administration events. Passwords and tokens are never stored in these records."
        />
        <AdminDataTable
          columns={columns}
          rows={rows}
          getRowId={(row) => row.id}
          loading={loading}
          error={error}
          emptyTitle="No audit events yet."
          search={q}
          onSearchChange={(value) => {
            setPage(1);
            setQ(value);
          }}
          searchPlaceholder="Filter by action"
          page={page}
          pageSize={25}
          totalItems={total}
          onPageChange={setPage}
        />
      </div>
    </PermissionGate>
  );
}
