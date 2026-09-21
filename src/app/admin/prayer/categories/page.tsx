'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { apiDelete, apiGet, apiPost } from '@/lib/api/client';
import { PageHeader } from '@/components/admin/PageHeader';
import { PermissionGate } from '@/components/admin/PermissionGate';
import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { publicErrorMessage } from '@/lib/admin/http-error';

interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  usage: number;
}

export default function PrayerCategoriesPage() {
  const { can } = useAuth();
  const [rows, setRows] = useState<CategoryRow[]>([]);
  const [name, setName] = useState('');
  const [pendingId, setPendingId] = useState<string | null>(null);

  function load() {
    void apiGet<CategoryRow[]>('/admin/prayer/categories').then((result) => {
      setRows(result.data || []);
    });
  }

  useEffect(() => {
    load();
  }, []);

  async function create() {
    const result = await apiPost('/admin/prayer/categories', { name });
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    toast.success('Category created.');
    setName('');
    load();
  }

  return (
    <PermissionGate permission="prayer.view">
      <div className="space-y-6">
        <PageHeader
          title="Prayer categories"
          description="Configurable labels only. They do not assume a person’s situation."
        />
        {can('prayer.moderate') ? (
          <form
            className="grid gap-3 rounded-md border p-4 sm:grid-cols-[1fr_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              void create();
            }}
          >
            <div className="space-y-1">
              <Label htmlFor="category-name">Name</Label>
              <Input
                id="category-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </div>
            <Button type="submit" className="self-end">
              Add category
            </Button>
          </form>
        ) : null}
        <ul className="divide-y rounded-md border">
          {rows.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
              <div>
                <p className="font-medium">{row.name}</p>
                <p className="text-sm text-muted-foreground">
                  {row.slug} · {row.usage} requests
                </p>
              </div>
              {can('prayer.moderate') && row.usage === 0 ? (
                <Button variant="outline" size="sm" onClick={() => setPendingId(row.id)}>
                  Remove
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
        <ConfirmDialog
          open={Boolean(pendingId)}
          onOpenChange={(open) => !open && setPendingId(null)}
          title="Remove this category?"
          description="Only unused categories can be removed."
          confirmLabel="Remove"
          destructive
          onConfirm={async () => {
            if (!pendingId) return;
            const result = await apiDelete(`/admin/prayer/categories/${pendingId}`);
            if (!result.success) {
              toast.error(publicErrorMessage(result.status, result.message));
              return;
            }
            setPendingId(null);
            load();
          }}
        />
      </div>
    </PermissionGate>
  );
}
