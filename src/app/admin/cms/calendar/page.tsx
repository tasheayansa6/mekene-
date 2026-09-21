'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api/client';
import { PageHeader } from '@/components/admin/PageHeader';
import { PermissionGate } from '@/components/admin/PermissionGate';
import { Badge } from '@/components/ui/badge';

interface CalendarItem {
  type: 'page' | 'news' | 'announcement' | 'sermon' | 'devotion';
  id: string;
  title: string;
  slug: string;
  publishAt: string | null;
}

const adminPaths: Partial<Record<CalendarItem['type'], (id: string) => string>> = {
  page: (id) => `/admin/content/pages/${id}`,
  news: (id) => `/admin/content/news/${id}`,
  announcement: (id) => `/admin/content/announcements/${id}`,
  sermon: (id) => `/admin/sermons/${id}`,
  devotion: (id) => `/admin/sermons/${id}`,
};

export default function CmsCalendarPage() {
  const [items, setItems] = useState<CalendarItem[]>([]);

  useEffect(() => {
    void apiGet<CalendarItem[]>('/admin/cms/calendar').then((result) => {
      if (result.success) setItems(result.data || []);
    });
  }, []);

  return (
    <PermissionGate permission="content.view">
      <div className="space-y-6">
        <PageHeader
          title="Content calendar"
          description="Scheduled items set to publish automatically."
        />

        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No scheduled content in the next 90 days.</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {items.map((item) => {
              const href = adminPaths[item.type]?.(item.id);
              return (
                <li key={`${item.type}-${item.id}`} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{item.title}</p>
                      <Badge variant="outline" className="capitalize">
                        {item.type}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Publishes{' '}
                      {item.publishAt
                        ? new Date(item.publishAt).toLocaleString()
                        : '—'}
                    </p>
                  </div>
                  {href ? (
                    <Link href={href} className="text-sm text-primary hover:underline">
                      Edit
                    </Link>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </PermissionGate>
  );
}
