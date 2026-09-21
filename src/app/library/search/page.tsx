import type { Metadata } from 'next';
import Link from 'next/link';

import { PageHero } from '@/components/sections/PageHero';
import { Section } from '@/components/layout/Section';
import { SectionHeading } from '@/components/sections/SectionHeading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SermonCard } from '@/components/cards/SermonCard';
import { searchLibrary } from '@/lib/library/search';
import { createPageMetadata } from '@/lib/seo';

export const revalidate = 60;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}): Promise<Metadata> {
  const { q } = await searchParams;
  return createPageMetadata({
    title: q ? `Search: ${q}` : 'Search Library',
    description: 'Search sermons, resources, and playlists in the church digital library.',
    path: '/library/search',
  });
}

function formatDate(value: string | null | undefined) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function kindLabel(kind: string) {
  if (kind === 'sermon') return 'Sermon';
  if (kind === 'resource') return 'Resource';
  if (kind === 'playlist') return 'Playlist';
  return kind;
}

export default async function LibrarySearchPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    kind?: string;
    contentType?: string;
  }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() || '';
  const kind = ['sermon', 'resource', 'playlist', 'all'].includes(params.kind || '')
    ? (params.kind as 'sermon' | 'resource' | 'playlist' | 'all')
    : 'all';

  const results = q
    ? await searchLibrary(q, {
        kind: kind === 'all' ? undefined : kind,
        contentType: params.contentType,
        pageSize: 24,
      })
    : null;

  return (
    <div className="page-transition">
      <PageHero
        title="Search Library"
        subtitle="Find teaching"
        description="Search sermons, resources, and playlists."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Library', href: '/library' },
          { label: 'Search' },
        ]}
      />
      <Section>
        <form className="mx-auto max-w-2xl space-y-4 rounded-lg border bg-card p-4" action="/library/search" method="get">
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="library-search">
              Search
            </label>
            <input
              id="library-search"
              name="q"
              type="search"
              defaultValue={q}
              placeholder="Title, speaker, scripture, or keyword"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="library-kind">
                Type
              </label>
              <select
                id="library-kind"
                name="kind"
                defaultValue={kind}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="all">All types</option>
                <option value="sermon">Sermons</option>
                <option value="resource">Resources</option>
                <option value="playlist">Playlists</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="library-content-type">
                Content type
              </label>
              <select
                id="library-content-type"
                name="contentType"
                defaultValue={params.contentType || ''}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="">Any</option>
                <option value="sermon">Sermon</option>
                <option value="bible_study">Bible study</option>
                <option value="devotion">Devotional</option>
              </select>
            </div>
          </div>
          <Button type="submit">Search</Button>
        </form>

        {results ? (
          <div className="mx-auto mt-10 max-w-4xl">
            <SectionHeading
              title={results.results.length ? `${results.totalItems} result${results.totalItems === 1 ? '' : 's'}` : 'No results'}
              description={q ? `Results for “${q}”` : undefined}
              align="left"
            />
            {results.results.length === 0 ? (
              <p className="mt-6 text-muted-foreground">Try a different search term or filter.</p>
            ) : (
              <ul className="mt-6 space-y-4">
                {results.results.map((item) => (
                  <li key={`${item.kind}-${item.id}`}>
                    {item.kind === 'sermon' ? (
                      <SermonCard
                        title={item.title}
                        speaker={item.speakerName}
                        date={formatDate(item.publishedAt)}
                        description={item.excerpt}
                        href={item.href}
                        hasAudio
                      />
                    ) : (
                      <Link
                        href={item.href}
                        className="block rounded-lg border bg-card p-4 transition-colors hover:border-primary/30"
                      >
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <Badge variant="secondary">{kindLabel(item.kind)}</Badge>
                          {item.contentType ? (
                            <Badge variant="outline">{item.contentType.replace('_', ' ')}</Badge>
                          ) : null}
                        </div>
                        <p className="font-medium">{item.title}</p>
                        {item.excerpt ? (
                          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.excerpt}</p>
                        ) : null}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <p className="mx-auto mt-10 max-w-2xl text-center text-muted-foreground">
            Enter a search term to explore the library.
          </p>
        )}
      </Section>
    </div>
  );
}
