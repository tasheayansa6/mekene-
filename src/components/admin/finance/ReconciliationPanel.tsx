'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { apiGet, apiPost } from '@/lib/api/client';
import { useAuth } from '@/components/providers/AuthProvider';
import { PageHeader } from '@/components/admin/PageHeader';
import { PermissionGate } from '@/components/admin/PermissionGate';
import { AdminDataTable, type AdminColumn } from '@/components/admin/AdminDataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { publicErrorMessage } from '@/lib/admin/http-error';

interface ReconciliationRow {
  id: string;
  periodLabel: string;
  source: string;
  statementReference: string | null;
  expectedTotal: string;
  actualTotal: string;
  difference?: string;
  currency?: string;
  status: string;
  statusLabel: string;
  createdAt: string;
}

function formatDifference(row: ReconciliationRow) {
  if (row.difference != null) {
    return `${row.difference}${row.currency ? ` ${row.currency}` : ''}`;
  }
  const expected = Number(row.expectedTotal);
  const actual = Number(row.actualTotal);
  if (Number.isNaN(expected) || Number.isNaN(actual)) return '—';
  const diff = actual - expected;
  return `${diff.toFixed(2)}${row.currency ? ` ${row.currency}` : ''}`;
}

export function ReconciliationPanel() {
  const { can } = useAuth();
  const [rows, setRows] = useState<ReconciliationRow[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    periodLabel: '',
    source: '',
    statementReference: '',
    expectedTotal: '',
    actualTotal: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const params = useMemo(
    () => ({ page: String(page), pageSize: '20' }),
    [page]
  );

  function load() {
    setLoading(true);
    void apiGet<ReconciliationRow[]>('/admin/finance/reconciliations', params).then(
      (result) => {
        setRows(result.data || []);
        setTotal(result.pagination?.totalItems || 0);
        setError(result.success ? null : result.message);
        setLoading(false);
      }
    );
  }

  useEffect(() => {
    load();
  }, [params]);

  async function createReconciliation() {
    if (!form.periodLabel.trim() || !form.source.trim()) {
      toast.error('Period label and source are required.');
      return;
    }
    setSaving(true);
    const result = await apiPost('/admin/finance/reconciliations', {
      periodLabel: form.periodLabel.trim(),
      source: form.source.trim(),
      statementReference: form.statementReference.trim() || null,
      expectedTotal: form.expectedTotal || '0',
      actualTotal: form.actualTotal || '0',
      notes: form.notes.trim() || null,
    });
    setSaving(false);
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    toast.success('Saved');
    setForm({
      periodLabel: '',
      source: '',
      statementReference: '',
      expectedTotal: '',
      actualTotal: '',
      notes: '',
    });
    load();
  }

  const columns: AdminColumn<ReconciliationRow>[] = [
    { key: 'periodLabel', header: 'Period', render: (row) => row.periodLabel },
    {
      key: 'source',
      header: 'Source',
      hideOnMobile: true,
      render: (row) => row.source,
    },
    {
      key: 'expectedTotal',
      header: 'Expected',
      render: (row) => row.expectedTotal,
    },
    {
      key: 'actualTotal',
      header: 'Actual',
      render: (row) => row.actualTotal,
    },
    {
      key: 'difference',
      header: 'Difference',
      render: (row) => formatDifference(row),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge variant="secondary">{row.statusLabel}</Badge>,
    },
  ];

  return (
    <PermissionGate permission="finance.view">
      <div className="space-y-6">
        <PageHeader
          title="Reconciliation"
          description="Compare statement totals to recorded activity. Expected, actual, and difference only."
        />

        {can('finance.create') ? (
          <Card>
            <CardHeader>
              <CardTitle>Create reconciliation</CardTitle>
              <CardDescription>Opens a new period for matching.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="recon-period">Period label</Label>
                <Input
                  id="recon-period"
                  value={form.periodLabel}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, periodLabel: event.target.value }))
                  }
                  placeholder="e.g. March 2026 bank"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="recon-source">Source</Label>
                <Input
                  id="recon-source"
                  value={form.source}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, source: event.target.value }))
                  }
                  placeholder="e.g. Bank statement"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="recon-ref">Statement reference</Label>
                <Input
                  id="recon-ref"
                  value={form.statementReference}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      statementReference: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="recon-expected">Expected total</Label>
                <Input
                  id="recon-expected"
                  value={form.expectedTotal}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, expectedTotal: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="recon-actual">Actual total</Label>
                <Input
                  id="recon-actual"
                  value={form.actualTotal}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, actualTotal: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="recon-notes">Notes</Label>
                <Textarea
                  id="recon-notes"
                  value={form.notes}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, notes: event.target.value }))
                  }
                />
              </div>
              <div className="sm:col-span-2">
                <Button
                  onClick={() => void createReconciliation()}
                  disabled={saving || !form.periodLabel.trim() || !form.source.trim()}
                >
                  Create reconciliation
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <AdminDataTable
          columns={columns}
          rows={rows}
          getRowId={(row) => row.id}
          loading={loading}
          error={error}
          emptyTitle="No reconciliations found."
          page={page}
          pageSize={20}
          totalItems={total}
          onPageChange={setPage}
        />
      </div>
    </PermissionGate>
  );
}
