'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { apiGet, apiPost } from '@/lib/api/client';
import { useAuth } from '@/components/providers/AuthProvider';
import { PageHeader } from '@/components/admin/PageHeader';
import { PermissionGate } from '@/components/admin/PermissionGate';
import { AdminDataTable, type AdminColumn } from '@/components/admin/AdminDataTable';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { publicErrorMessage } from '@/lib/admin/http-error';

export type ContentKind = 'pages' | 'news' | 'announcements' | 'resources';

interface ContentRow {
  id: string;
  title: string;
  slug: string;
  status: string;
  isFeatured: boolean;
  updatedAt: string;
  publishedAt: string | null;
  author: { name: string } | null;
  category?: { name: string } | null;
  priority?: string;
}

const TITLES: Record<ContentKind, { title: string; description: string; create: string }> = {
  pages: {
    title: 'Pages',
    description: 'Manage public CMS pages. These appear at /pages/[slug] and cannot override core routes.',
    create: 'Create page',
  },
  news: {
    title: 'News',
    description: 'Write and publish church news. Drafts stay private until an authorized user publishes them.',
    create: 'Create article',
  },
  announcements: {
    title: 'Announcements',
    description: 'Time-bound messages for the public website. Expired announcements remain in history.',
    create: 'Create announcement',
  },
  resources: {
    title: 'Resources',
    description: 'Upload study guides, forms, and other downloadable church documents.',
    create: 'Create resource',
  },
};

function statusVariant(status: string) {
  if (status === 'published') return 'default' as const;
  if (status === 'scheduled') return 'secondary' as const;
  if (status === 'archived') return 'outline' as const;
  return 'secondary' as const;
}

export function ContentTable({ kind }: { kind: ContentKind }) {
  const { can } = useAuth();
  const copy = TITLES[kind];
  const [rows, setRows] = useState<ContentRow[]>([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [confirm, setConfirm] = useState<{ action: string; ids: string[] } | null>(null);
  const [pending, setPending] = useState(false);

  const params = useMemo(() => {
    const next: Record<string, string> = { page: String(page), pageSize: '20' };
    if (q) next.q = q;
    if (status !== 'all') next.status = status;
    return next;
  }, [q, status, page]);

  function load() {
    setLoading(true);
    void apiGet<ContentRow[]>(`/admin/content/${kind}`, params).then((result) => {
      setRows(result.data || []);
      setTotal(result.pagination?.totalItems || 0);
      setError(result.success ? null : result.message);
      setLoading(false);
    });
  }

  useEffect(() => {
    const handle = setTimeout(load, 200);
    return () => clearTimeout(handle);
  }, [params, kind]);

  async function runBulk(action: string, ids: string[]) {
    setPending(true);
    const result = await apiPost(`/admin/content/${kind}/bulk`, { action, ids });
    setPending(false);
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    toast.success(result.message || 'Updated.');
    setConfirm(null);
    setSelected([]);
    load();
  }

  const columns: AdminColumn<ContentRow>[] = [
    { key: 'title', header: 'Title', render: (row) => row.title },
    {
      key: 'author',
      header: 'Author',
      hideOnMobile: true,
      render: (row) => row.author?.name || '—',
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge variant={statusVariant(row.status)}>{row.status}</Badge>,
    },
    {
      key: 'isFeatured',
      header: 'Featured',
      hideOnMobile: true,
      render: (row) => (row.isFeatured ? 'Yes' : '—'),
    },
    {
      key: 'publishedAt',
      header: 'Published',
      hideOnMobile: true,
      render: (row) =>
        row.publishedAt ? new Date(row.publishedAt).toLocaleDateString() : '—',
    },
    {
      key: 'updatedAt',
      header: 'Updated',
      hideOnMobile: true,
      render: (row) => new Date(row.updatedAt).toLocaleDateString(),
    },
  ];

  return (
    <PermissionGate permission="content.view">
      <div className="space-y-6">
        <PageHeader
          title={copy.title}
          description={copy.description}
          actions={
            can('content.create') ? (
              <Button asChild>
                <Link href={`/admin/content/${kind}/create`}>{copy.create}</Link>
              </Button>
            ) : null
          }
        />
        <AdminDataTable
          columns={columns}
          rows={rows}
          getRowId={(row) => row.id}
          loading={loading}
          error={error}
          emptyTitle={`No ${copy.title.toLowerCase()} yet.`}
          emptyDescription="Create content as a draft. It will not appear on the public website until it is published."
          emptyAction={
            can('content.create') ? (
              <Button asChild>
                <Link href={`/admin/content/${kind}/create`}>{copy.create}</Link>
              </Button>
            ) : null
          }
          search={q}
          onSearchChange={(value) => {
            setPage(1);
            setQ(value);
          }}
          searchPlaceholder={`Search ${copy.title.toLowerCase()}`}
          filters={
            <Select
              value={status}
              onValueChange={(value) => {
                setPage(1);
                setStatus(value);
              }}
            >
              <SelectTrigger className="w-full sm:w-40" aria-label="Filter by status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="review">Review</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          }
          page={page}
          pageSize={20}
          totalItems={total}
          onPageChange={setPage}
          selectable={can('content.update')}
          selectedIds={selected}
          onSelectedChange={setSelected}
          bulkActions={
            can('content.update')
              ? [
                  ...(can('content.publish') ? [{ id: 'publish', label: 'Publish' }] : []),
                  { id: 'unpublish', label: 'Unpublish' },
                  ...(can('content.archive')
                    ? [{ id: 'archive', label: 'Archive', destructive: true }]
                    : []),
                ]
              : []
          }
          onBulkAction={(action) => setConfirm({ action, ids: selected })}
          rowActions={(row) => (
            <div className="flex flex-wrap gap-2">
              {can('content.update') ? (
                <Button asChild variant="outline" size="sm">
                  <Link href={`/admin/content/${kind}/${row.id}`}>Edit</Link>
                </Button>
              ) : null}
              <Button asChild variant="ghost" size="sm">
                <Link href={`/admin/content/${kind}/${row.id}/preview`}>Preview</Link>
              </Button>
            </div>
          )}
        />
        <ConfirmDialog
          open={Boolean(confirm)}
          onOpenChange={(open) => !open && setConfirm(null)}
          title={
            confirm?.action === 'archive'
              ? 'Archive selected content?'
              : confirm?.action === 'publish'
                ? 'Publish selected content?'
                : 'Apply this action?'
          }
          description={
            confirm?.action === 'archive'
              ? 'Archived items are hidden from the public website but kept for church records. This can be reversed later.'
              : confirm?.action === 'publish'
                ? 'Published items become visible on the public website.'
                : 'This will update all selected records.'
          }
          confirmLabel="Continue"
          destructive={confirm?.action === 'archive'}
          loading={pending}
          onConfirm={() => confirm && runBulk(confirm.action, confirm.ids)}
        />
      </div>
    </PermissionGate>
  );
}
