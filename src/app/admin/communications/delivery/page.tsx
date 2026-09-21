'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api/client';
import { PageHeader } from '@/components/admin/PageHeader';
import { PermissionGate } from '@/components/admin/PermissionGate';
import { AdminDataTable, type AdminColumn } from '@/components/admin/AdminDataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Row {
  id: string;
  channel: string;
  status: string;
  errorCode: string | null;
  attemptCount: number;
  sentAt: string | null;
  failedAt: string | null;
  createdAt: string;
  userId: string | null;
  jobId: string | null;
}

export default function AdminCommunicationsDeliveryPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const params = useMemo(() => ({ page: String(page), pageSize: '20' }), [page]);

  useEffect(() => {
    setLoading(true);
    void apiGet<Row[]>('/admin/communications/delivery', params).then((result) => {
      setRows(result.data || []);
      setTotal(result.pagination?.totalItems || 0);
      setError(result.success ? null : result.message);
      setLoading(false);
    });
  }, [params]);

  const columns: AdminColumn<Row>[] = [
    { key: 'channel', header: 'Channel', render: (row) => row.channel },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge variant="outline">{row.status}</Badge>,
    },
    {
      key: 'errorCode',
      header: 'Error',
      render: (row) => row.errorCode || '—',
    },
    {
      key: 'attemptCount',
      header: 'Attempts',
      render: (row) => String(row.attemptCount),
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (row) => new Date(row.createdAt).toLocaleString(),
    },
  ];

  return (
    <PermissionGate permission="communications.view">
      <div className="space-y-6">
        <PageHeader
          title="Delivery log"
          description="In-app, email, and channel delivery attempts."
          actions={
            <Button asChild variant="outline">
              <Link href="/admin/communications">Overview</Link>
            </Button>
          }
        />
        <AdminDataTable
          columns={columns}
          rows={rows}
          getRowId={(row) => row.id}
          loading={loading}
          error={error}
          page={page}
          pageSize={20}
          totalItems={total}
          onPageChange={setPage}
          emptyTitle="No deliveries"
          emptyDescription="Queued communications will appear here after processing."
        />
      </div>
    </PermissionGate>
  );
}
