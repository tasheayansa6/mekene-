'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiGet } from '@/lib/api/client';
import { PageHeader } from '@/components/admin/PageHeader';
import { PermissionGate } from '@/components/admin/PermissionGate';
import { AdminDataTable, type AdminColumn } from '@/components/admin/AdminDataTable';
import { Badge } from '@/components/ui/badge';

interface AppointmentRow {
  id: string;
  positionTitle: string | null;
  memberName: string | null;
  startAt: string;
  endAt: string | null;
  status: string;
  organizationLabel: string | null;
}

export default function Page() {
  const [rows, setRows] = useState<AppointmentRow[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const params = useMemo(
    () => ({ page: String(page), pageSize: '20' }),
    [page]
  );

  useEffect(() => {
    setLoading(true);
    void apiGet<AppointmentRow[]>('/admin/governance/leadership/history', params).then(
      (result) => {
        setRows(result.data || []);
        setTotal(result.pagination?.totalItems || 0);
        setLoading(false);
      }
    );
  }, [params]);

  const columns: AdminColumn<AppointmentRow>[] = [
    {
      key: 'memberName',
      header: 'Member',
      render: (row) => row.memberName || '—',
    },
    {
      key: 'positionTitle',
      header: 'Position',
      render: (row) => row.positionTitle || '—',
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge variant="secondary">{row.status}</Badge>,
    },
    {
      key: 'startAt',
      header: 'Start',
      hideOnMobile: true,
      render: (row) => new Date(row.startAt).toLocaleDateString(),
    },
    {
      key: 'endAt',
      header: 'End',
      hideOnMobile: true,
      render: (row) => (row.endAt ? new Date(row.endAt).toLocaleDateString() : '—'),
    },
  ];

  return (
    <PermissionGate permission="governance.view">
      <div className="space-y-6">
        <PageHeader
          title="Leadership history"
          description="All governance appointments across statuses."
        />
        <AdminDataTable
          columns={columns}
          rows={rows}
          getRowId={(row) => row.id}
          loading={loading}
          page={page}
          pageSize={20}
          totalItems={total}
          onPageChange={setPage}
        />
      </div>
    </PermissionGate>
  );
}
