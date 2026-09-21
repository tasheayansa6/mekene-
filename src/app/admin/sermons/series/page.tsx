'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api/client';
import { ensureCsrfToken, getCsrfToken } from '@/lib/api/client';
import { CSRF_HEADER_NAME } from '@/lib/auth/config';
import { PageHeader } from '@/components/admin/PageHeader';
import { PermissionGate } from '@/components/admin/PermissionGate';
import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { Badge } from '@/components/ui/badge';
import { publicErrorMessage } from '@/lib/admin/http-error';

interface SeriesRow {
  id: string;
  name: string;
  slug: string;
  status: string;
  sermonCount: number;
  description: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
}

export default function SeriesAdminPage() {
  const { can } = useAuth();
  const [rows, setRows] = useState<SeriesRow[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [pendingId, setPendingId] = useState<string | null>(null);

  function load() {
    void apiGet<SeriesRow[]>('/admin/sermons/series').then((result) => {
      setRows(result.data || []);
    });
  }

  useEffect(() => {
    load();
  }, []);

  async function create() {
    const result = await apiPost('/admin/sermons/series', { name, description: description || null, status: 'draft' });
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    toast.success('Series created as a draft.');
    setName('');
    setDescription('');
    load();
  }

  async function uploadImage(id: string, file: File) {
    const csrf = getCsrfToken() || (await ensureCsrfToken());
    const body = new FormData();
    body.set('file', file);
    body.set('kind', 'image');
    const response = await fetch('/api/v1/admin/sermons/uploads', {
      method: 'POST',
      credentials: 'include',
      headers: csrf ? { [CSRF_HEADER_NAME]: csrf } : undefined,
      body,
    });
    const json = await response.json();
    if (!json.success) {
      toast.error(publicErrorMessage(response.status, json.message));
      return;
    }
    const result = await apiPatch(`/admin/sermons/series/${id}`, {
      imageUrl: json.data.url,
      imageAlt: file.name.slice(0, 180),
    });
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    load();
  }

  return (
    <PermissionGate permission="sermons.view">
      <div className="space-y-6">
        <PageHeader
          title="Sermon series"
          description="Group sermons into a series. Publish a series before its public page appears."
        />
        {can('sermons.create') ? (
          <form
            className="space-y-3 rounded-md border p-4"
            onSubmit={(event) => {
              event.preventDefault();
              void create();
            }}
          >
            <div className="space-y-1">
              <Label htmlFor="series-name">Name</Label>
              <Input id="series-name" value={name} onChange={(event) => setName(event.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="series-description">Description (optional)</Label>
              <Textarea id="series-description" rows={3} value={description} onChange={(event) => setDescription(event.target.value)} />
            </div>
            <Button type="submit">Add series</Button>
          </form>
        ) : null}
        <ul className="divide-y rounded-md border">
          {rows.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
              <div>
                <p className="font-medium">{row.name}</p>
                <p className="text-sm text-muted-foreground">
                  {row.slug} · {row.sermonCount} sermons
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={row.status === 'published' ? 'default' : 'secondary'}>{row.status}</Badge>
                {can('sermons.update') ? (
                  <label className="text-sm">
                    <span className="sr-only">Upload series image</span>
                    <Input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="max-w-48"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void uploadImage(row.id, file);
                      }}
                    />
                  </label>
                ) : null}
                {can('sermons.publish') && row.status !== 'published' ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      const result = await apiPatch(`/admin/sermons/series/${row.id}`, { status: 'published' });
                      if (!result.success) toast.error(publicErrorMessage(result.status, result.message));
                      else load();
                    }}
                  >
                    Publish
                  </Button>
                ) : null}
                {can('sermons.archive') ? (
                  <Button variant="outline" size="sm" onClick={() => setPendingId(row.id)}>
                    Archive
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
        <ConfirmDialog
          open={Boolean(pendingId)}
          onOpenChange={(open) => !open && setPendingId(null)}
          title="Archive this series?"
          description="The series page will be hidden. Sermons in the series are not deleted."
          confirmLabel="Archive"
          destructive
          onConfirm={async () => {
            if (!pendingId) return;
            const result = await apiDelete(`/admin/sermons/series/${pendingId}`);
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
