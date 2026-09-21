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
  reference: string;
  amount: string;
  currency: string;
  status: string;
  statusLabel: string;
  paymentMethodLabel: string;
  createdAt: string;
  category: { name: string } | null;
  isAnonymous: boolean;
}

export default function ContributionsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const params = useMemo(
    () => ({ page: String(page), pageSize: '20', ...(q ? { q } : {}) }),
    [page, q]
  );

  useEffect(() => {
    const handle = setTimeout(() => {
      setLoading(true);
      void apiGet<Row[]>('/admin/giving/contributions', params).then((result) => {
        setRows(result.data || []);
        setTotal(result.pagination?.totalItems || 0);
        setError(result.success ? null : result.message);
        setLoading(false);
      });
    }, 200);
    return () => clearTimeout(handle);
  }, [params]);

  const columns: AdminColumn<Row>[] = [
    { key: 'reference', header: 'Reference', render: (row) => row.reference },
    {
      key: 'category',
      header: 'Type',
      render: (row) => row.category?.name || '—',
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (row) => `${row.amount} ${row.currency}`,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge variant="secondary">{row.statusLabel}</Badge>,
    },
    {
      key: 'method',
      header: 'Method',
      hideOnMobile: true,
      render: (row) => row.paymentMethodLabel,
    },
    {
      key: 'createdAt',
      header: 'Date',
      render: (row) => new Date(row.createdAt).toLocaleString(),
    },
  ];

  return (
    <PermissionGate permission="giving.view">
      <div className="space-y-6">
        <PageHeader
          title="Contributions"
          description="Successful totals exclude pending, failed, cancelled, and fully refunded gifts."
          actions={
            <Button asChild>
              <Link href="/admin/giving/record">Record offline</Link>
            </Button>
          }
        />
        <AdminDataTable
          columns={columns}
          rows={rows}
          getRowId={(row) => row.id}
          loading={loading}
          error={error}
          emptyTitle="No contributions found."
          search={q}
          onSearchChange={(value) => {
            setQ(value);
            setPage(1);
          }}
          page={page}
          pageSize={20}
          totalItems={total}
          onPageChange={setPage}
          rowActions={(row) => (
            <Button asChild size="sm" variant="outline">
              <Link href={`/admin/giving/contributions/${row.id}`}>Open</Link>
            </Button>
          )}
        />
      </div>
    </PermissionGate>
  );
}
