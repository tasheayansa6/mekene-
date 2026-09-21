'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiGet } from '@/lib/api/client';
import { PageHeader } from '@/components/admin/PageHeader';
import { PermissionGate } from '@/components/admin/PermissionGate';
import { AdminDataTable, type AdminColumn } from '@/components/admin/AdminDataTable';
import { Badge } from '@/components/ui/badge';

interface LedgerRow {
  id: string;
  reference: string;
  type: string;
  typeLabel?: string;
  status: string;
  statusLabel?: string;
  amount: string;
  currency: string;
  entryDate: string;
  description: string | null;
  fund: { name: string } | null;
}

export default function FinanceLedgerPage() {
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');

  const params = useMemo(() => {
    const next: Record<string, string> = {
      page: String(page),
      pageSize: '20',
    };
    if (q.trim()) next.q = q.trim();
    return next;
  }, [page, q]);

  useEffect(() => {
    const handle = setTimeout(() => {
      setLoading(true);
      void apiGet<LedgerRow[]>('/admin/finance/ledger', params).then((result) => {
        setRows(result.data || []);
        setTotal(result.pagination?.totalItems || 0);
        setError(result.success ? null : result.message);
        setLoading(false);
      });
    }, 150);
    return () => clearTimeout(handle);
  }, [params]);

  const columns: AdminColumn<LedgerRow>[] = [
    { key: 'reference', header: 'Reference', render: (row) => row.reference },
    {
      key: 'entryDate',
      header: 'Date',
      render: (row) => new Date(row.entryDate).toLocaleDateString(),
    },
    {
      key: 'type',
      header: 'Type',
      render: (row) => row.typeLabel || row.type,
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (row) => `${row.amount} ${row.currency}`,
    },
    {
      key: 'fund',
      header: 'Fund',
      hideOnMobile: true,
      render: (row) => row.fund?.name || '—',
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge variant="secondary">{row.statusLabel || row.status}</Badge>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      hideOnMobile: true,
      render: (row) => row.description || '—',
    },
  ];

  return (
    <PermissionGate permission="finance.view">
      <div className="space-y-6">
        <PageHeader
          title="Ledger"
          description="Posted financial entries. Donor identities are not listed."
        />
        <AdminDataTable
          columns={columns}
          rows={rows}
          getRowId={(row) => row.id}
          loading={loading}
          error={error}
          emptyTitle="No ledger entries found."
          search={q}
          onSearchChange={(value) => {
            setQ(value);
            setPage(1);
          }}
          page={page}
          pageSize={20}
          totalItems={total}
          onPageChange={setPage}
        />
      </div>
    </PermissionGate>
  );
}
