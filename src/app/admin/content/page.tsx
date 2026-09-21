'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { FileText, FolderOpen, Megaphone, Newspaper, Tags } from 'lucide-react';
import { apiGet } from '@/lib/api/client';
import { PageHeader } from '@/components/admin/PageHeader';
import { PermissionGate } from '@/components/admin/PermissionGate';
import { StatCard } from '@/components/admin/StatCard';
import { Button } from '@/components/ui/button';

interface Totals {
  total: number;
  draft: number;
  published: number;
  scheduled: number;
  archived: number;
}

interface Overview {
  pages: Totals;
  news: Totals;
  announcements: Totals;
  resources: Totals;
  categories: number;
  tags: number;
}

export default function ContentOverviewPage() {
  const [data, setData] = useState<Overview | null>(null);

  useEffect(() => {
    void apiGet<Overview>('/admin/content/overview').then((result) => {
      if (result.success) setData(result.data);
    });
  }, []);

  return (
    <PermissionGate permission="content.view">
      <div className="space-y-8">
        <PageHeader
          title="Content"
          description="Manage public website pages, news, announcements, and resources without changing source code."
          actions={
            <Button asChild>
              <Link href="/admin/content/news/create">New article</Link>
            </Button>
          }
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Pages" value={data?.pages.total} href="/admin/content/pages" icon={FileText} />
          <StatCard label="News" value={data?.news.total} href="/admin/content/news" icon={Newspaper} />
          <StatCard
            label="Announcements"
            value={data?.announcements.total}
            href="/admin/content/announcements"
            icon={Megaphone}
          />
          <StatCard
            label="Resources"
            value={data?.resources.total}
            href="/admin/content/resources"
            icon={FolderOpen}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard label="Categories" value={data?.categories} href="/admin/content/categories" icon={Tags} />
          <StatCard label="Tags" value={data?.tags} href="/admin/content/tags" icon={Tags} />
        </div>
        <p className="text-sm text-muted-foreground">
          Draft, scheduled, and archived items stay off the public website. Featured items are limited to three per
          type.
        </p>
      </div>
    </PermissionGate>
  );
}
