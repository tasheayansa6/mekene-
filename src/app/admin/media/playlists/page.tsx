'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { apiGet, apiPatch, apiPost } from '@/lib/api/client';
import { PageHeader } from '@/components/admin/PageHeader';
import { PermissionGate } from '@/components/admin/PermissionGate';
import { ApiErrorAlert } from '@/components/admin/ApiErrorAlert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

type PlaylistRow = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  status: string;
  isPublic: boolean;
  isFeatured: boolean;
  itemCount: number;
  href: string;
};

export default function AdminMediaPlaylistsPage() {
  const [rows, setRows] = useState<PlaylistRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  async function load() {
    const result = await apiGet<PlaylistRow[]>('/admin/media/playlists', { pageSize: '50' });
    if (!result.success) {
      setError(result.message);
      setRows([]);
      return;
    }
    setRows(result.data || []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function createPlaylist(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    setCreating(true);
    const result = await apiPost('/admin/media/playlists', {
      title: title.trim(),
      description: description.trim() || undefined,
      isPublic: false,
    });
    setCreating(false);
    if (!result.success) {
      toast.error(result.message);
      return;
    }
    toast.success('Playlist created.');
    setTitle('');
    setDescription('');
    await load();
  }

  async function publish(id: string) {
    const result = await apiPatch(`/admin/media/playlists/${id}`, { publish: true });
    if (!result.success) {
      toast.error(result.message);
      return;
    }
    toast.success('Playlist published.');
    await load();
  }

  return (
    <PermissionGate permission="media.view">
      <div className="space-y-6">
        <PageHeader
          title="Playlists"
          description="Curated sermon collections for the public library."
          actions={
            <Button asChild variant="outline">
              <Link href="/admin/media">Back to media</Link>
            </Button>
          }
        />
        {error ? <ApiErrorAlert message={error} /> : null}

        <Card>
          <CardHeader>
            <CardTitle>Create playlist</CardTitle>
            <CardDescription>New playlists start as drafts. Publish when ready.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid max-w-xl gap-4" onSubmit={(event) => void createPlaylist(event)}>
              <div>
                <Label htmlFor="playlist-title">Title</Label>
                <Input
                  id="playlist-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="playlist-description">Description</Label>
                <Textarea
                  id="playlist-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={3}
                />
              </div>
              <Button type="submit" disabled={creating}>
                {creating ? 'Creating…' : 'Create playlist'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {!rows ? <Skeleton className="h-40 w-full" /> : null}
        {rows && rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No playlists yet.</p>
        ) : (
          <ul className="space-y-3">
            {rows?.map((row) => (
              <li key={row.id}>
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <CardTitle className="text-base">{row.title}</CardTitle>
                      <Badge variant="outline">{row.status}</Badge>
                    </div>
                    <CardDescription>
                      /{row.slug} · {row.itemCount} item{row.itemCount === 1 ? '' : 's'}
                      {row.isFeatured ? ' · Featured' : ''}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/admin/media/playlists/${row.id}`}>Edit</Link>
                    </Button>
                    {row.status !== 'published' ? (
                      <Button size="sm" onClick={() => void publish(row.id)}>
                        Publish
                      </Button>
                    ) : (
                      <Button asChild size="sm" variant="ghost">
                        <Link href={row.href} target="_blank">
                          View public
                        </Link>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PermissionGate>
  );
}
