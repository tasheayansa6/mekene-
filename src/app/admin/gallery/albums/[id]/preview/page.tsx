'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api/client';
import { PermissionGate } from '@/components/admin/PermissionGate';
import { PageHeader } from '@/components/admin/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string>('');
  const [album, setAlbum] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    void params.then((value) => {
      setId(value.id);
      void apiGet<Record<string, unknown>>(`/admin/gallery/albums/${value.id}`).then((result) => {
        setAlbum(result.data);
      });
    });
  }, [params]);

  const items = ((album?.items as Array<Record<string, unknown>>) || []).filter(
    (item) => item.status === 'published'
  );

  return (
    <PermissionGate permission="gallery.view">
      <div className="space-y-6">
        <PageHeader
          title="Album preview"
          description="This preview shows only media that would appear publicly if the album is published."
          actions={
            <Button asChild variant="outline">
              <Link href={`/admin/gallery/albums/${id}`}>Back to editor</Link>
            </Button>
          }
        />
        {!album ? (
          <p>Loading preview…</p>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge>{String(album.status)}</Badge>
              {album.isFeatured ? <Badge variant="secondary">Featured</Badge> : null}
            </div>
            <h2 className="text-2xl font-semibold">{String(album.title)}</h2>
            <p className="text-muted-foreground">{String(album.description || '')}</p>
            {items.length === 0 ? (
              <p>This album does not contain any published media yet.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((item) => (
                  <div key={String(item.id)} className="rounded-md border p-3">
                    <p className="font-medium">{String(item.title)}</p>
                    <p className="text-sm text-muted-foreground">{String(item.mediaType)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </PermissionGate>
  );
}
