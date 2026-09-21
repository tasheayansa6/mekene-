'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { apiGet, apiPatch } from '@/lib/api/client';
import { PageHeader } from '@/components/admin/PageHeader';
import { PermissionGate } from '@/components/admin/PermissionGate';
import { ApiErrorAlert } from '@/components/admin/ApiErrorAlert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';

type PlaylistDetail = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  status: string;
  isPublic: boolean;
  isFeatured: boolean;
  items: Array<{
    id: string;
    sortOrder: number;
    sermon: { id: string; title: string; slug: string } | null;
    series: { id: string; name: string; slug: string } | null;
  }>;
};

export default function AdminMediaPlaylistEditPage() {
  const params = useParams<{ id: string }>();
  const playlistId = params.id;
  const [playlist, setPlaylist] = useState<PlaylistDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);

  useEffect(() => {
    void apiGet<{ playlist: PlaylistDetail }>(`/admin/media/playlists/${playlistId}`).then(
      (result) => {
        if (!result.success || !result.data?.playlist) {
          setError(result.message);
          return;
        }
        const row = result.data.playlist;
        setPlaylist(row);
        setTitle(row.title);
        setDescription(row.description || '');
        setIsFeatured(row.isFeatured);
      }
    );
  }, [playlistId]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    const result = await apiPatch(`/admin/media/playlists/${playlistId}`, {
      title: title.trim(),
      description: description.trim() || null,
      isFeatured,
    });
    setSaving(false);
    if (!result.success) {
      toast.error(result.message);
      return;
    }
    toast.success('Playlist updated.');
  }

  async function publish() {
    const result = await apiPatch(`/admin/media/playlists/${playlistId}`, { publish: true });
    if (!result.success) {
      toast.error(result.message);
      return;
    }
    toast.success('Playlist published.');
    setPlaylist((current) => (current ? { ...current, status: 'published', isPublic: true } : current));
  }

  return (
    <PermissionGate permission="media.view">
      <div className="space-y-6">
        <PageHeader
          title={playlist?.title || 'Edit playlist'}
          description="Update playlist details. Item ordering is managed via the API."
          actions={
            <Button asChild variant="outline">
              <Link href="/admin/media/playlists">All playlists</Link>
            </Button>
          }
        />
        {error ? <ApiErrorAlert message={error} /> : null}
        {!playlist ? <Skeleton className="h-48 w-full" /> : null}
        {playlist ? (
          <>
            <form className="grid max-w-xl gap-4" onSubmit={(event) => void save(event)}>
              <div>
                <Label htmlFor="edit-title">Title</Label>
                <Input id="edit-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={isFeatured} onCheckedChange={(v) => setIsFeatured(v === true)} />
                Featured on library home
              </label>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving…' : 'Save changes'}
                </Button>
                {playlist.status !== 'published' ? (
                  <Button type="button" variant="secondary" onClick={() => void publish()}>
                    Publish
                  </Button>
                ) : null}
              </div>
            </form>
            <section>
              <h2 className="mb-3 text-lg font-semibold">Items ({playlist.items.length})</h2>
              {playlist.items.length === 0 ? (
                <p className="text-sm text-muted-foreground">No items yet.</p>
              ) : (
                <ol className="list-decimal space-y-1 pl-5 text-sm">
                  {playlist.items.map((item) => (
                    <li key={item.id}>
                      {item.sermon?.title || item.series?.name || 'Untitled'}
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </>
        ) : null}
      </div>
    </PermissionGate>
  );
}
