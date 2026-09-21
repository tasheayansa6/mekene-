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

interface TagRow {
  id: string;
  name: string;
  slug: string;
  usage: number;
}

export default function TagsAdminPage() {
  const { can } = useAuth();
  const [rows, setRows] = useState<TagRow[]>([]);
  const [name, setName] = useState('');
  const [pendingId, setPendingId] = useState<string | null>(null);

  function load() {
    void apiGet<TagRow[]>('/admin/content/tags').then((result) => setRows(result.data || []));
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <PermissionGate permission="content.view">
      <div className="space-y-6">
        <PageHeader
          title="Tags"
          description="Reusable tags for news and future content types. Administrators choose the actual tags."
        />
        {can('content.create') ? (
          <form
            className="flex flex-col gap-3 rounded-md border p-4 sm:flex-row sm:items-end"
            onSubmit={async (event) => {
              event.preventDefault();
              const result = await apiPost('/admin/content/tags', { name });
              if (!result.success) {
                toast.error(publicErrorMessage(result.status, result.message));
                return;
              }
              toast.success('Tag created.');
              setName('');
              load();
            }}
          >
            <div className="flex-1 space-y-1">
              <Label htmlFor="tag-name">Name</Label>
              <Input id="tag-name" value={name} onChange={(event) => setName(event.target.value)} required />
            </div>
            <Button type="submit">Add tag</Button>
          </form>
        ) : null}
        <ul className="divide-y rounded-md border">
          {rows.map((row) => (
            <li key={row.id} className="flex items-center justify-between gap-3 p-3">
              <div>
                <p className="font-medium">{row.name}</p>
                <p className="text-sm text-muted-foreground">
                  {row.slug} · {row.usage} articles
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
          title="Delete this tag?"
          description="The tag will be removed from news articles that use it."
          confirmLabel="Delete"
          destructive
          onConfirm={async () => {
            if (!pendingId) return;
            const result = await apiDelete(`/admin/content/tags/${pendingId}`);
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
