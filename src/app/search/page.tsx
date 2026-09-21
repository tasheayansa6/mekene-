import type { Metadata } from 'next';
import Link from 'next/link';
import { Search } from 'lucide-react';

import { PageHero } from '@/components/sections/PageHero';
import { Section } from '@/components/layout/Section';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { searchPublicContent } from '@/lib/cms/search';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Search',
  description: 'Search published pages, news, announcements, resources, sermons, events, FAQs, and more.',
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = '' } = await searchParams;
  const query = q.trim();
  let results: Array<{ type: string; title: string; href: string; excerpt: string | null }> = [];

  if (query) {
    const search = await searchPublicContent(query, { pageSize: 48 });
    results = search.results.map((item) => ({
      type: item.type.charAt(0).toUpperCase() + item.type.slice(1),
      title: item.title,
      href: item.href,
      excerpt: item.excerpt,
    }));
  }

  return (
    <div className="page-transition">
      <PageHero
        title="Search"
        description="Find published church website content. Drafts and scheduled items are never included."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Search' },
        ]}
      />
      <Section>
        <form className="mx-auto flex max-w-2xl flex-col gap-3 sm:flex-row" action="/search" method="get">
          <label className="sr-only" htmlFor="site-search">
            Search
          </label>
          <Input id="site-search" name="q" defaultValue={query} placeholder="Search published content" />
          <Button type="submit">
            <Search className="mr-2 size-4" />
            Search
          </Button>
        </form>
        <div className="mx-auto mt-10 max-w-2xl space-y-4">
          {!query ? (
            <p className="text-center text-muted-foreground">Enter a search term to look across published content.</p>
          ) : results.length === 0 ? (
            <p className="text-center text-muted-foreground">No published content matched that search.</p>
          ) : (
            results.map((item) => (
              <Link key={`${item.type}-${item.href}-${item.title}`} href={item.href} className="block rounded-lg border p-4 hover:border-primary/40">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{item.type}</p>
                <h2 className="mt-1 text-lg font-semibold text-primary">{item.title}</h2>
                {item.excerpt ? <p className="mt-1 text-sm text-muted-foreground">{item.excerpt}</p> : null}
              </Link>
            ))
          )}
        </div>
      </Section>
    </div>
  );
}
