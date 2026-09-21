'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { apiGet, apiPost, apiPatch } from '@/lib/api/client';
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

interface ExpenseRow {
  id: string;
  reference: string;
  description: string;
  amount: string;
  currency: string;
  vendor: string | null;
  expenseDate: string;
  status: string;
  statusLabel: string;
  category: { id: string; name: string } | null;
}

const STATUS_FILTERS = [
  { value: 'all', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'paid', label: 'Paid' },
  { value: 'cancelled', label: 'Cancelled' },
];

export function ExpensesPanel() {
  const { can } = useAuth();
  const [rows, setRows] = useState<ExpenseRow[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [status, setStatus] = useState('all');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    description: '',
    amount: '',
    vendor: '',
    expenseDate: '',
    categoryId: '',
  });
  const [saving, setSaving] = useState(false);

  const params = useMemo(() => {
    const next: Record<string, string> = {
      page: String(page),
      pageSize: '20',
    };
    if (status !== 'all') next.status = status;
    if (q.trim()) next.q = q.trim();
    return next;
  }, [page, status, q]);

  function load() {
    setLoading(true);
    void apiGet<ExpenseRow[]>('/admin/finance/expenses', params).then((result) => {
      setRows(result.data || []);
      setTotal(result.pagination?.totalItems || 0);
      setError(result.success ? null : result.message);
      setLoading(false);
    });
  }

  useEffect(() => {
    const handle = setTimeout(load, 150);
    return () => clearTimeout(handle);
  }, [params]);

  useEffect(() => {
    void apiGet<ExpenseCategory[]>('/admin/finance/expense-categories').then((result) => {
      setCategories(result.data || []);
    });
  }, []);

  async function createExpense() {
    if (!form.description.trim() || !form.amount || !form.expenseDate) {
      toast.error('Description, amount, and date are required.');
      return;
    }
    setSaving(true);
    const result = await apiPost('/admin/finance/expenses', {
      description: form.description.trim(),
      amount: form.amount,
      vendor: form.vendor.trim() || null,
      expenseDate: form.expenseDate,
      categoryId: form.categoryId || null,
      currency: 'ETB',
    });
    setSaving(false);
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    toast.success('Saved');
    setForm({
      description: '',
      amount: '',
      vendor: '',
      expenseDate: '',
      categoryId: '',
    });
    load();
  }

  async function runAction(id: string, action: string, rejectionReason?: string) {
    const result = await apiPatch(`/admin/finance/expenses/${id}`, {
      action,
      ...(rejectionReason ? { rejectionReason } : {}),
    });
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    toast.success('Updated');
    load();
  }

  const columns: AdminColumn<ExpenseRow>[] = [
    { key: 'reference', header: 'Reference', render: (row) => row.reference },
    {
      key: 'description',
      header: 'Description',
      render: (row) => row.description,
    },
    {
      key: 'category',
      header: 'Category',
      hideOnMobile: true,
      render: (row) => row.category?.name || '—',
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (row) => `${row.amount} ${row.currency}`,
    },
    {
      key: 'expenseDate',
      header: 'Date',
      hideOnMobile: true,
      render: (row) => new Date(row.expenseDate).toLocaleDateString(),
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
          title="Expenses"
          description="Submit, review, and pay church expenses. Approval actions follow your finance permissions."
        />

        {can('finance.create') ? (
          <Card>
            <CardHeader>
              <CardTitle>Create expense</CardTitle>
              <CardDescription>Starts as draft until submitted for review.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="expense-description">Description</Label>
                <Textarea
                  id="expense-description"
                  value={form.description}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, description: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expense-amount">Amount (ETB)</Label>
                <Input
                  id="expense-amount"
                  value={form.amount}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, amount: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expense-date">Expense date</Label>
                <Input
                  id="expense-date"
                  type="date"
                  value={form.expenseDate}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, expenseDate: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expense-vendor">Vendor</Label>
                <Input
                  id="expense-vendor"
                  value={form.vendor}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, vendor: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={form.categoryId || 'none'}
                  onValueChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      categoryId: value === 'none' ? '' : value,
                    }))
                  }
                >
                  <SelectTrigger aria-label="Expense category">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Uncategorized</SelectItem>
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
                  onClick={() => void createExpense()}
                  disabled={saving || !form.description.trim() || !form.amount || !form.expenseDate}
                >
                  Create expense
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-48" aria-label="Filter by status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTERS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <AdminDataTable
          columns={columns}
          rows={rows}
          getRowId={(row) => row.id}
          loading={loading}
          error={error}
          emptyTitle="No expenses found."
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
            <div className="flex flex-wrap gap-1">
              {can('finance.update') &&
              (row.status === 'draft' || row.status === 'rejected') ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void runAction(row.id, 'submit')}
                >
                  Submit
                </Button>
              ) : null}
              {can('finance.moderate') &&
              (row.status === 'submitted' || row.status === 'under_review') ? (
                <>
                  <Button size="sm" onClick={() => void runAction(row.id, 'approve')}>
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void runAction(row.id, 'reject', 'Rejected')}
                  >
                    Reject
                  </Button>
                </>
              ) : null}
              {can('finance.manage') && row.status === 'approved' ? (
                <Button size="sm" onClick={() => void runAction(row.id, 'pay')}>
                  Mark paid
                </Button>
              ) : null}
            </div>
          )}
        />
      </div>
    </PermissionGate>
  );
}
