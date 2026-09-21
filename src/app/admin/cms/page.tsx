'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  Calendar,
  ClipboardList,
  FileText,
  FolderOpen,
  HelpCircle,
  ImageIcon,
  Layout,
  Megaphone,
  Menu,
  MessageSquare,
  Newspaper,
  Clapperboard,
  BookOpen,
} from 'lucide-react';
import { apiGet } from '@/lib/api/client';
import { PageHeader } from '@/components/admin/PageHeader';
import { PermissionGate } from '@/components/admin/PermissionGate';
import { StatCard } from '@/components/admin/StatCard';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface ContentTotals {
  total: number;
  draft: number;
  review: number;
  scheduled: number;
  published: number;
  archived: number;
}

interface CmsOverview {
  pages: ContentTotals;
  news: ContentTotals;
  announcements: ContentTotals;
  resources: ContentTotals;
  faqs: ContentTotals;
  testimonials: ContentTotals;
  reviewQueue: number;
  scheduled: number;
  homepageSections: number;
}

function sumPublished(...groups: ContentTotals[]) {
  return groups.reduce((sum, group) => sum + group.published, 0);
}

function sumDrafts(...groups: ContentTotals[]) {
  return groups.reduce((sum, group) => sum + group.draft, 0);
}

function sumReview(...groups: ContentTotals[]) {
  return groups.reduce((sum, group) => sum + group.review, 0);
}

function sumScheduled(...groups: ContentTotals[]) {
  return groups.reduce((sum, group) => sum + group.scheduled, 0);
}

function sumArchived(...groups: ContentTotals[]) {
  return groups.reduce((sum, group) => sum + group.archived, 0);
}

const quickLinks = [
  { label: 'Pages', href: '/admin/content/pages', icon: FileText },
  { label: 'News', href: '/admin/content/news', icon: Newspaper },
  { label: 'Announcements', href: '/admin/content/announcements', icon: Megaphone },
  { label: 'Resources', href: '/admin/content/resources', icon: FolderOpen },
  { label: 'Homepage', href: '/admin/cms/homepage', icon: Layout },
  { label: 'FAQs', href: '/admin/cms/faqs', icon: HelpCircle },
  { label: 'Menus', href: '/admin/cms/menus', icon: Menu },
  { label: 'Testimonials', href: '/admin/cms/testimonials', icon: MessageSquare },
  { label: 'Review queue', href: '/admin/cms/review', icon: ClipboardList },
  { label: 'Calendar', href: '/admin/cms/calendar', icon: Calendar },
  { label: 'Media', href: '/admin/media', icon: Clapperboard },
  { label: 'Sermons', href: '/admin/sermons', icon: BookOpen },
  { label: 'Gallery', href: '/admin/gallery', icon: ImageIcon },
];

export default function CmsDashboardPage() {
  const [data, setData] = useState<CmsOverview | null>(null);

  useEffect(() => {
    void apiGet<CmsOverview>('/admin/cms/overview').then((result) => {
      if (result.success) setData(result.data);
    });
  }, []);

  const groups = data
    ? [data.pages, data.news, data.announcements, data.resources, data.faqs, data.testimonials]
    : [];

  return (
    <PermissionGate permission="content.view">
      <div className="space-y-8">
        <PageHeader
          title="CMS"
          description="Manage homepage sections, FAQs, menus, testimonials, and content workflow from one hub."
          actions={
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link href="/admin/content/pages/create">New page</Link>
              </Button>
              <Button asChild>
                <Link href="/admin/content/news/create">New news</Link>
              </Button>
            </div>
          }
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard
            label="Published"
            value={groups.length ? sumPublished(...groups) : undefined}
            href="/admin/content"
            icon={FileText}
            loading={!data}
          />
          <StatCard
            label="Drafts"
            value={groups.length ? sumDrafts(...groups) : undefined}
            href="/admin/content/pages?status=draft"
            icon={Newspaper}
            loading={!data}
          />
          <StatCard
            label="In review"
            value={groups.length ? sumReview(...groups) : undefined}
            href="/admin/cms/review"
            icon={ClipboardList}
            loading={!data}
          />
          <StatCard
            label="Scheduled"
            value={data?.scheduled}
            href="/admin/cms/calendar"
            icon={Calendar}
            loading={!data}
          />
          <StatCard
            label="Archived"
            value={groups.length ? sumArchived(...groups) : undefined}
            href="/admin/content/pages?status=archived"
            icon={FolderOpen}
            loading={!data}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Review queue"
            value={data?.reviewQueue}
            href="/admin/cms/review"
            icon={ClipboardList}
            loading={!data}
          />
          <StatCard
            label="Homepage sections"
            value={data?.homepageSections}
            href="/admin/cms/homepage"
            icon={Layout}
            loading={!data}
          />
          <StatCard
            label="FAQs"
            value={data?.faqs.total}
            href="/admin/cms/faqs"
            icon={HelpCircle}
            loading={!data}
          />
          <StatCard
            label="Testimonials"
            value={data?.testimonials.total}
            href="/admin/cms/testimonials"
            icon={MessageSquare}
            loading={!data}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>CMS tools</CardTitle>
            <CardDescription>Jump to content types and site configuration.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {quickLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:border-primary/40 hover:bg-muted/40"
                  >
                    <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="size-4 text-primary" />
                    </div>
                    <span className="text-sm font-medium">{link.label}</span>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </PermissionGate>
  );
}
