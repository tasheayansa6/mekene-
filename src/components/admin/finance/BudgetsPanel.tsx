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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { publicErrorMessage } from '@/lib/admin/http-error';

interface ExpenseCategory {
  id: string;
  name: string;
}

interface BudgetRow {
  id: string;
  name: string;
  period: string;
  periodLabel?: string;
  periodStart: string;
  periodEnd: string;
  allocatedAmount: string;
  actualAmount?: string;
  remainingAmount?: string;
  currency: string;
  status: string;
  statusLabel: string;
  expenseCategory: { id: string; name: string } | null;
}

export function BudgetsPanel() {
  const { can } = useAuth();
  const [rows, setRows] = useState<BudgetRow[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    allocatedAmount: '',
    period: 'annual',
    periodStart: '',
    periodEnd: '',
    expenseCategoryId: '',
  });
  const [saving, setSaving] = useState(false);

  const params = useMemo(
    () => ({ page: String(page), pageSize: '20' }),
    [page]
  );

  function load() {
    setLoading(true);
    void apiGet<BudgetRow[]>('/admin/finance/budgets', params).then((result) => {
      setRows(result.data || []);
      setTotal(result.pagination?.totalItems || 0);
      setError(result.success ? null : result.message);
      setLoading(false);
    });
  }

  useEffect(() => {
    load();
  }, [params]);

  useEffect(() => {
    void apiGet<ExpenseCategory[]>('/admin/finance/expense-categories').then((result) => {
      setCategories(result.data || []);
    });
  }, []);

  async function createBudget() {
    if (!form.name.trim() || !form.allocatedAmount || !form.periodStart || !form.periodEnd) {
      toast.error('Name, amount, and period dates are required.');
      return;
    }
    setSaving(true);
    const result = await apiPost('/admin/finance/budgets', {
      name: form.name.trim(),
      allocatedAmount: form.allocatedAmount,
      period: form.period,
      periodStart: form.periodStart,
      periodEnd: form.periodEnd,
      expenseCategoryId: form.expenseCategoryId || null,
      currency: 'ETB',
      status: 'draft',
    });
    setSaving(false);
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    toast.success('Saved');
    setForm({
      name: '',
      allocatedAmount: '',
      period: 'annual',
      periodStart: '',
      periodEnd: '',
      expenseCategoryId: '',
    });
    load();
  }

  const columns: AdminColumn<BudgetRow>[] = [
    { key: 'name', header: 'Budget', render: (row) => row.name },
    {
      key: 'period',
      header: 'Period',
      hideOnMobile: true,
      render: (row) =>
        row.periodLabel ||
        `${new Date(row.periodStart).toLocaleDateString()} – ${new Date(row.periodEnd).toLocaleDateString()}`,
    },
    {
      key: 'allocatedAmount',
      header: 'Allocated',
      render: (row) => `${row.allocatedAmount} ${row.currency}`,
    },
    {
      key: 'actualAmount',
      header: 'Actual',
      hideOnMobile: true,
      render: (row) =>
        row.actualAmount != null ? `${row.actualAmount} ${row.currency}` : '—',
    },
    {
      key: 'remainingAmount',
      header: 'Remaining',
      hideOnMobile: true,
      render: (row) =>
        row.remainingAmount != null ? `${row.remainingAmount} ${row.currency}` : '—',
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
          title="Budgets"
          description="Allocate spending by period. Actual and remaining appear when the API provides them."
        />

        {can('finance.create') ? (
          <Card>
            <CardHeader>
              <CardTitle>Create budget</CardTitle>
              <CardDescription>Starts in draft until activated elsewhere.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="budget-name">Name</Label>
                <Input
                  id="budget-name"
                  value={form.name}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="budget-amount">Allocated (ETB)</Label>
                <Input
                  id="budget-amount"
                  value={form.allocatedAmount}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, allocatedAmount: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Period type</Label>
                <Select
                  value={form.period}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, period: value }))}
                >
                  <SelectTrigger aria-label="Budget period">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="annual">Annual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="budget-start">Period start</Label>
                <Input
                  id="budget-start"
                  type="date"
                  value={form.periodStart}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, periodStart: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="budget-end">Period end</Label>
                <Input
                  id="budget-end"
                  type="date"
                  value={form.periodEnd}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, periodEnd: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Expense category</Label>
                <Select
                  value={form.expenseCategoryId || 'none'}
                  onValueChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      expenseCategoryId: value === 'none' ? '' : value,
                    }))
                  }
                >
                  <SelectTrigger aria-label="Budget expense category">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Any category</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Button
                  onClick={() => void createBudget()}
                  disabled={
                    saving ||
                    !form.name.trim() ||
                    !form.allocatedAmount ||
                    !form.periodStart ||
                    !form.periodEnd
                  }
                >
                  Create budget
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
          emptyTitle="No budgets found."
          page={page}
          pageSize={20}
          totalItems={total}
          onPageChange={setPage}
        />
      </div>
    </PermissionGate>
  );
}
