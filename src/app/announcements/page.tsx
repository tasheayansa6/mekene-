import type { Metadata } from 'next';
import Link from 'next/link';
import { Megaphone, Search } from 'lucide-react';

import { PageHero } from '@/components/sections/PageHero';
import { Section } from '@/components/layout/Section';
import { SectionHeading } from '@/components/sections/SectionHeading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MarkdownContent } from '@/components/content/MarkdownContent';
import { getActiveAnnouncements } from '@/lib/content/public';
import { serializeAuthor } from '@/lib/content/query';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Announcements',
  description: 'Currently active announcements from Busa Mekene Eyasus Church.',
};

function priorityVariant(priority: string) {
  if (priority === 'urgent') return 'default' as const;
  if (priority === 'important') return 'secondary' as const;
  return 'outline' as const;
}

export default async function AnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim().toLowerCase() || '';
  const category = params.category?.trim() || '';
  const all = (await getActiveAnnouncements()).filter((row) => row.audience === 'everyone');
  const categories = [...new Set(all.map((row) => row.category))].sort();
  const announcements = all.filter((item) => {
    if (category && item.category !== category) return false;
    if (!q) return true;
    return (
      item.title.toLowerCase().includes(q) ||
      item.excerpt.toLowerCase().includes(q) ||
      item.content.toLowerCase().includes(q)
    );
  });

  return (
    <div className="page-transition">
      <PageHero
        title="Announcements"
        subtitle="Now"
        description="Active messages from the church. Expired announcements are kept for records but are not listed here."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Announcements' },
        ]}
      />

      <Section>
        <form
          className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row"
          action="/announcements"
          method="get"
        >
          <label className="sr-only" htmlFor="announcement-search">
            Search announcements
          </label>
          <Input
            id="announcement-search"
            name="q"
            defaultValue={params.q || ''}
            placeholder="Search announcements"
          />
          {category ? <input type="hidden" name="category" value={category} /> : null}
          <Button type="submit">
            <Search className="mr-2 size-4" />
            Search
          </Button>
        </form>

        {categories.length > 0 ? (
          <div className="mx-auto mt-6 flex max-w-3xl flex-wrap gap-2">
            <Button asChild size="sm" variant={!category ? 'default' : 'outline'}>
              <Link href={q ? `/announcements?q=${encodeURIComponent(q)}` : '/announcements'}>
                All
              </Link>
            </Button>
            {categories.map((cat) => (
              <Button
                key={cat}
                asChild
                size="sm"
                variant={category === cat ? 'default' : 'outline'}
              >
                <Link
                  href={`/announcements?category=${encodeURIComponent(cat)}${
                    q ? `&q=${encodeURIComponent(q)}` : ''
                  }`}
                >
                  {cat}
                </Link>
              </Button>
            ))}
          </div>
        ) : null}

        <SectionHeading icon={Megaphone} title="Current announcements" />
        {announcements.length === 0 ? (
          <p className="mx-auto mt-8 max-w-2xl text-center text-muted-foreground">
            There are no active announcements right now.
          </p>
        ) : (
          <div className="mx-auto mt-10 max-w-3xl space-y-6">
            {announcements.map((item) => (
              <article key={item.id} className="rounded-xl border bg-card p-6">
                <div className="flex flex-wrap gap-2">
                  <Badge variant={priorityVariant(item.priority)}>{item.priority}</Badge>
                  {item.isFeatured ? <Badge variant="outline">Featured</Badge> : null}
                  <Badge variant="outline">{item.category}</Badge>
                </div>
                <h2 className="mt-3 text-2xl font-bold text-primary">
                  <Link href={`/announcements/${item.slug}`} className="hover:underline">
                    {item.title}
                  </Link>
                </h2>
                <p className="mt-2 text-muted-foreground">{item.excerpt}</p>
                <div className="mt-4">
                  <MarkdownContent content={item.content} />
                </div>
                <p className="mt-4 text-sm text-muted-foreground">
                  {serializeAuthor(item.author)?.name}
                </p>
              </article>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
