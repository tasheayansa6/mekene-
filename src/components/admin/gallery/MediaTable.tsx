'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api/client';
import { PageHeader } from '@/components/admin/PageHeader';
import { PermissionGate } from '@/components/admin/PermissionGate';
import { AdminDataTable, type AdminColumn } from '@/components/admin/AdminDataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface MediaRow {
  id: string;
  title: string;
  mediaType: string;
  status: string;
  isFeatured: boolean;
  updatedAt: string;
  album: { id: string; title: string } | null;
}

export function MediaTable({ type }: { type: 'photo' | 'video' }) {
  const [rows, setRows] = useState<MediaRow[]>([]);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const params = useMemo(() => {
    const next: Record<string, string> = { page: String(page), pageSize: '20', type };
    if (q) next.q = q;
    return next;
  }, [q, page, type]);

  useEffect(() => {
    setLoading(true);
    const handle = setTimeout(() => {
      void apiGet<MediaRow[]>('/admin/gallery/media', params).then((result) => {
        setRows(result.data || []);
        setTotal(result.pagination?.totalItems || 0);
        setError(result.success ? null : result.message);
        setLoading(false);
      });
    }, 200);
    return () => clearTimeout(handle);
  }, [params]);

  const columns: AdminColumn<MediaRow>[] = [
    { key: 'title', header: type === 'photo' ? 'Photo' : 'Video', render: (row) => row.title },
    { key: 'album', header: 'Album', hideOnMobile: true, render: (row) => row.album?.title || '—' },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge variant={row.status === 'published' ? 'default' : 'secondary'}>{row.status}</Badge>,
    },
    { key: 'isFeatured', header: 'Featured', hideOnMobile: true, render: (row) => (row.isFeatured ? 'Yes' : '—') },
    {
      key: 'updatedAt',
      header: 'Updated',
      hideOnMobile: true,
      render: (row) => new Date(row.updatedAt).toLocaleDateString(),
    },
  ];

  return (
    <PermissionGate permission="gallery.view">
      <div className="space-y-6">
        <PageHeader
          title={type === 'photo' ? 'Photos' : 'Videos'}
          description={
            type === 'video'
              ? 'Public videos use YouTube or Vimeo. Sermon videos should be linked, not uploaded twice.'
              : 'Photos stay in draft until they are reviewed and published.'
          }
        />
        <AdminDataTable
          columns={columns}
          rows={rows}
          getRowId={(row) => row.id}
          loading={loading}
          error={error}
          emptyTitle={type === 'photo' ? 'No photos yet.' : 'No videos yet.'}
          emptyDescription="Add media from an album. Do not invent church photographs or videos."
          search={q}
          onSearchChange={(value) => {
            setPage(1);
            setQ(value);
          }}
          searchPlaceholder={`Search ${type === 'photo' ? 'photos' : 'videos'}`}
          page={page}
          pageSize={20}
          totalItems={total}
          onPageChange={setPage}
          rowActions={(row) =>
            row.album ? (
              <Button asChild variant="outline" size="sm">
                <Link href={`/admin/gallery/albums/${row.album.id}`}>Open album</Link>
              </Button>
            ) : null
          }
        />
      </div>
    </PermissionGate>
  );
}
