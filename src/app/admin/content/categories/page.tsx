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
  scope: 'news' | 'resource';
  description: string | null;
  usage: number;
}

export default function CategoriesAdminPage() {
  const { can } = useAuth();
  const [rows, setRows] = useState<CategoryRow[]>([]);
  const [name, setName] = useState('');
  const [scope, setScope] = useState<'news' | 'resource'>('news');
  const [pendingId, setPendingId] = useState<string | null>(null);

  function load() {
    void apiGet<CategoryRow[]>('/admin/content/categories').then((result) => {
      setRows(result.data || []);
    });
  }

  useEffect(() => {
    load();
  }, []);

  async function create() {
    const result = await apiPost('/admin/content/categories', { name, scope });
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    toast.success('Category created.');
    setName('');
    load();
  }

  return (
    <PermissionGate permission="content.view">
      <div className="space-y-6">
        <PageHeader
          title="Categories"
          description="Administrators create the actual news and resource categories. Example names are only suggestions."
        />
        {can('content.create') ? (
          <form
            className="grid gap-3 rounded-md border p-4 sm:grid-cols-[1fr_10rem_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              void create();
            }}
          >
            <div className="space-y-1">
              <Label htmlFor="category-name">Name</Label>
              <Input id="category-name" value={name} onChange={(event) => setName(event.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="category-scope">Used for</Label>
              <select
                id="category-scope"
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                value={scope}
                onChange={(event) => setScope(event.target.value as 'news' | 'resource')}
              >
                <option value="news">News</option>
                <option value="resource">Resources</option>
              </select>
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
                  {row.scope} · {row.slug} · {row.usage} items
                </p>
              </div>
              {can('content.delete') ? (
                <Button variant="outline" size="sm" onClick={() => setPendingId(row.id)}>
                  Delete
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
        <ConfirmDialog
          open={Boolean(pendingId)}
          onOpenChange={(open) => !open && setPendingId(null)}
          title="Delete this category?"
          description="Categories in use cannot be deleted. Unused categories are removed permanently."
          confirmLabel="Delete"
          destructive
          onConfirm={async () => {
            if (!pendingId) return;
            const result = await apiDelete(`/admin/content/categories/${pendingId}`);
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
