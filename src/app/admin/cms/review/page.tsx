'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api/client';
import { PageHeader } from '@/components/admin/PageHeader';
import { PermissionGate } from '@/components/admin/PermissionGate';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface ReviewItem {
  type: 'page' | 'news' | 'announcement' | 'resource';
  id: string;
  title: string;
  slug: string;
  updatedAt: string;
}

const editPaths: Record<ReviewItem['type'], (id: string) => string> = {
  page: (id) => `/admin/content/pages/${id}`,
  news: (id) => `/admin/content/news/${id}`,
  announcement: (id) => `/admin/content/announcements/${id}`,
  resource: (id) => `/admin/content/resources/${id}`,
};

export default function CmsReviewPage() {
  const [items, setItems] = useState<ReviewItem[]>([]);

  useEffect(() => {
    void apiGet<ReviewItem[]>('/admin/cms/review-queue').then((result) => {
      if (result.success) setItems(result.data || []);
    });
  }, []);

  return (
    <PermissionGate permission="content.view">
      <div className="space-y-6">
        <PageHeader
          title="Review queue"
          description="Content awaiting review before it can be published."
        />

        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing is waiting for review.</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {items.map((item) => (
              <li key={`${item.type}-${item.id}`} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{item.title}</p>
                    <Badge variant="outline" className="capitalize">
                      {item.type}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Updated {new Date(item.updatedAt).toLocaleString()}
                  </p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href={editPaths[item.type](item.id)}>Review</Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PermissionGate>
  );
}
