'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { apiGet, apiPost, apiPatch } from '@/lib/api/client';
import { useAuth } from '@/components/providers/AuthProvider';
import { PageHeader } from '@/components/admin/PageHeader';
import { PermissionDenied } from '@/components/admin/PermissionDenied';
import { AdminDataTable, type AdminColumn } from '@/components/admin/AdminDataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { publicErrorMessage } from '@/lib/admin/http-error';

interface FundRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  isPublic: boolean;
  minAmount: string;
  maxAmount: string | null;
  supportedCurrencies: string[];
  presetAmounts: string[];
  accountingCode: string | null;
}

const emptyForm = {
  id: '',
  name: '',
  slug: '',
  description: '',
  isActive: true,
  isPublic: true,
  minAmount: '1.00',
  maxAmount: '',
  presets: '100,250,500,1000',
  currencies: 'ETB',
  accountingCode: '',
};

export function FundsPanel() {
  const { can } = useAuth();
  const canAccess =
    can('giving.view') ||
    can('giving.publish') ||
    can('finance.view') ||
    can('finance.manage');
  const canWrite = can('giving.publish') || can('finance.manage');

  const [rows, setRows] = useState<FundRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    void apiGet<{ funds: FundRow[] }>('/admin/finance/funds').then((result) => {
      setRows(result.data?.funds || []);
      setError(result.success ? null : result.message);
      setLoading(false);
    });
  }

  useEffect(() => {
    if (canAccess) load();
  }, [canAccess]);

  function editRow(row: FundRow) {
    setForm({
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description || '',
      isActive: row.isActive,
      isPublic: row.isPublic,
      minAmount: row.minAmount,
      maxAmount: row.maxAmount || '',
      presets: (row.presetAmounts || []).join(','),
      currencies: (row.supportedCurrencies || ['ETB']).join(','),
      accountingCode: row.accountingCode || '',
    });
  }

  async function save() {
    if (!form.name.trim()) {
      toast.error('Name is required.');
      return;
    }
    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim() || undefined,
      description: form.description.trim() || null,
      isActive: form.isActive,
      isPublic: form.isPublic,
      minAmount: form.minAmount || '1.00',
      maxAmount: form.maxAmount.trim() || null,
      presetAmounts: form.presets
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean),
      supportedCurrencies: form.currencies
        .split(',')
        .map((v) => v.trim().toUpperCase())
        .filter(Boolean),
      accountingCode: form.accountingCode.trim() || null,
    };
    setSaving(true);
    const result = form.id
      ? await apiPatch('/admin/finance/funds', { id: form.id, ...payload })
      : await apiPost('/admin/finance/funds', payload);
    setSaving(false);
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    toast.success(form.id ? 'Fund updated.' : 'Fund created.');
    setForm(emptyForm);
    load();
  }

  if (!canAccess) return <PermissionDenied />;

  const columns: AdminColumn<FundRow>[] = [
    { key: 'name', header: 'Name', render: (row) => row.name },
    { key: 'slug', header: 'Slug', hideOnMobile: true, render: (row) => row.slug },
    {
      key: 'min',
      header: 'Min',
      render: (row) => row.minAmount,
    },
    {
      key: 'flags',
      header: 'Status',
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          <Badge variant={row.isActive ? 'default' : 'secondary'}>
            {row.isActive ? 'Active' : 'Inactive'}
          </Badge>
          <Badge variant="outline">{row.isPublic ? 'Public' : 'Private'}</Badge>
        </div>
      ),
    },
    {
      key: 'code',
      header: 'Code',
      hideOnMobile: true,
      render: (row) => row.accountingCode || '—',
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Giving funds"
        description="Public funds appear on the give form. Amounts never use floating-point money on the server."
      />

      {canWrite ? (
        <Card>
          <CardHeader>
            <CardTitle>{form.id ? 'Edit fund' : 'Create fund'}</CardTitle>
            <CardDescription>
              Presets and currencies are comma-separated (e.g. 100,250,500 and ETB).
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fund-name">Name</Label>
              <Input
                id="fund-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fund-slug">Slug (optional)</Label>
              <Input
                id="fund-slug"
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                placeholder="auto from name"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="fund-desc">Description</Label>
              <Textarea
                id="fund-desc"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fund-min">Min amount</Label>
              <Input
                id="fund-min"
                value={form.minAmount}
                onChange={(e) => setForm((f) => ({ ...f, minAmount: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fund-max">Max amount (optional)</Label>
              <Input
                id="fund-max"
                value={form.maxAmount}
                onChange={(e) => setForm((f) => ({ ...f, maxAmount: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fund-presets">Presets</Label>
              <Input
                id="fund-presets"
                value={form.presets}
                onChange={(e) => setForm((f) => ({ ...f, presets: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fund-currencies">Currencies</Label>
              <Input
                id="fund-currencies"
                value={form.currencies}
                onChange={(e) => setForm((f) => ({ ...f, currencies: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fund-code">Accounting code</Label>
              <Input
                id="fund-code"
                value={form.accountingCode}
                onChange={(e) =>
                  setForm((f) => ({ ...f, accountingCode: e.target.value }))
                }
              />
            </div>
            <div className="flex items-center gap-4 pt-6">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="fund-active"
                  checked={form.isActive}
                  onCheckedChange={(checked) =>
                    setForm((f) => ({ ...f, isActive: checked === true }))
                  }
                />
                <Label htmlFor="fund-active">Active</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="fund-public"
                  checked={form.isPublic}
                  onCheckedChange={(checked) =>
                    setForm((f) => ({ ...f, isPublic: checked === true }))
                  }
                />
                <Label htmlFor="fund-public">Public</Label>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <Button onClick={() => void save()} disabled={saving}>
                {saving ? 'Saving…' : form.id ? 'Update fund' : 'Create fund'}
              </Button>
              {form.id ? (
                <Button type="button" variant="ghost" onClick={() => setForm(emptyForm)}>
                  Cancel edit
                </Button>
              ) : null}
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
        emptyTitle="No funds yet."
        rowActions={
          canWrite
            ? (row) => (
                <Button size="sm" variant="outline" onClick={() => editRow(row)}>
                  Edit
                </Button>
              )
            : undefined
        }
      />
    </div>
  );
}
