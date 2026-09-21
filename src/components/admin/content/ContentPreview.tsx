'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api/client';
import { PermissionGate } from '@/components/admin/PermissionGate';
import { PageHeader } from '@/components/admin/PageHeader';
import { MarkdownContent } from '@/components/content/MarkdownContent';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ApiErrorAlert } from '@/components/admin/ApiErrorAlert';
import type { ContentKind } from './ContentTable';

export function ContentPreview({ kind, id }: { kind: ContentKind; id: string }) {
  const [item, setItem] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void apiGet<Record<string, unknown>>(`/admin/content/${kind}/${id}`).then((result) => {
      if (!result.success || !result.data) {
        setError(result.message || 'Unable to load preview.');
        return;
      }
      setItem(result.data);
    });
  }, [kind, id]);

  const title = String(item?.title || 'Preview');
  const content = String(item?.content || item?.description || '');
  const image = String(item?.featuredImageUrl || item?.thumbnailUrl || '');

  return (
    <PermissionGate permission="content.view">
      <div className="space-y-6">
        <PageHeader
          title="Preview"
          description="This is how visitors will see published content. Drafts and scheduled items are not public."
          actions={
            <div className="flex gap-2">
              <Button asChild variant="outline">
                <Link href={`/admin/content/${kind}/${id}`}>Edit</Link>
              </Button>
              <Button asChild variant="ghost">
                <Link href={`/admin/content/${kind}`}>Back</Link>
              </Button>
            </div>
          }
        />
        {error ? <ApiErrorAlert message={error} /> : null}
        {item ? (
          <article className="mx-auto max-w-3xl space-y-4 rounded-xl border bg-card p-4 sm:p-8">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{String(item.status)}</Badge>
              <Badge variant="outline">Authorized preview</Badge>
            </div>
            <h1 className="text-3xl font-bold text-primary">{title}</h1>
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt={String(item.featuredImageAlt || item.thumbnailAlt || title)} className="w-full rounded-lg" />
            ) : null}
            <MarkdownContent content={content} />
          </article>
        ) : null}
      </div>
    </PermissionGate>
  );
}
