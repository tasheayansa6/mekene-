import type { Metadata } from 'next';
import Link from 'next/link';
import { BookOpen } from 'lucide-react';

import { PageHero } from '@/components/sections/PageHero';
import { Section } from '@/components/layout/Section';
import { SectionHeading } from '@/components/sections/SectionHeading';
import { SermonCard } from '@/components/cards/SermonCard';
import { SermonFilters } from '@/components/sermons/SermonFilters';
import { Button } from '@/components/ui/button';
import { getPublicSermonList } from '@/lib/sermons/public';
import { createPageMetadata } from '@/lib/seo';

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  return createPageMetadata({
    title: 'Sermons & Teachings',
    description:
      'Browse published sermons from Busa Mekene Eyasus Church. Only sermons released by church administrators appear here.',
    path: '/sermons',
  });
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function queryString(params: Record<string, string | undefined>, page?: number) {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) next.set(key, value);
  }
  if (page && page > 1) next.set('page', String(page));
  const qs = next.toString();
  return qs ? `/sermons?${qs}` : '/sermons';
}

export default async function SermonsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    search?: string;
    speaker?: string;
    series?: string;
    category?: string;
    from?: string;
    to?: string;
    sort?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const q = params.q || params.search || '';
  const page = Number(params.page || 1);
  const sort = params.sort === 'oldest' ? 'oldest' : 'newest';
  const from = params.from ? `${params.from}T00:00:00.000Z` : undefined;
  const to = params.to ? `${params.to}T23:59:59.000Z` : undefined;
  const filtered = Boolean(q || params.speaker || params.series || params.category || params.from || params.to);
  const result = await getPublicSermonList({
    q,
    speaker: params.speaker,
    series: params.series,
    category: params.category,
    from,
    to,
    sort,
    page: Number.isNaN(page) ? 1 : page,
  });
  const totalPages = Math.max(1, Math.ceil(result.totalItems / result.pageSize));
  const query = {
    q,
    speaker: params.speaker,
    series: params.series,
    category: params.category,
    from: params.from,
    to: params.to,
    sort: sort === 'oldest' ? 'oldest' : undefined,
  };

  return (
    <div className="page-transition">
      <PageHero
        title="Sermons & Teachings"
        subtitle="The Word of God"
        description="Published sermons from Busa Mekene Eyasus Church. Drafts and scheduled items are not listed here."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Sermons' },
        ]}
      />

      {result.featured && !filtered ? (
        <Section variant="warm">
          <SectionHeading
            icon={BookOpen}
            title="Featured sermon"
            align="left"
            description="Highlighted teaching from the church library."
            className="mb-10"
          />
          <div className="mx-auto max-w-3xl">
            <SermonCard
              title={result.featured.title}
              speaker={result.featured.speakerName}
              date={formatDate(result.featured.sermonDate)}
              description={result.featured.description}
              thumbnailUrl={result.featured.thumbnailUrl}
              thumbnailAlt={result.featured.thumbnailAlt}
              href={`/sermons/${result.featured.slug}`}
              hasAudio={result.featured.hasAudio}
              hasVideo={Boolean(result.featured.video)}
            />
          </div>
        </Section>
      ) : null}

      <Section>
        <SermonFilters
          search={q}
          speaker={params.speaker}
          series={params.series}
          category={params.category}
          from={params.from}
          to={params.to}
          sort={sort}
          speakers={result.speakers.map((item) => ({ label: item.name, value: item.id }))}
          seriesOptions={result.series.map((item) => ({ label: item.name, value: item.slug }))}
          categories={result.categories.map((item) => ({ label: item.name, value: item.slug }))}
        />
        {result.series.length > 0 && !filtered ? (
          <div className="mt-6 flex flex-wrap gap-2">
            {result.series.map((item) => (
              <Button key={item.slug} asChild size="sm" variant="outline">
                <Link href={`/sermons/series/${item.slug}`}>{item.name}</Link>
              </Button>
            ))}
          </div>
        ) : null}
      </Section>

      <Section>
        <SectionHeading
          title="Latest sermons"
          description={
            result.totalItems
              ? `${result.totalItems} published sermon${result.totalItems === 1 ? '' : 's'}.`
              : undefined
          }
        />
        {result.sermons.length === 0 ? (
          <p className="mx-auto mt-8 max-w-2xl text-center text-muted-foreground">
            {filtered
              ? 'No sermons matched your search. Try another search term.'
              : 'No sermons available yet. Please check back soon.'}
          </p>
        ) : (
          <div className="mx-auto mt-10 grid max-w-6xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {result.sermons.map((sermon) => (
              <SermonCard
                key={sermon.id}
                title={sermon.title}
                speaker={sermon.speakerName}
                date={formatDate(sermon.sermonDate)}
                description={sermon.description}
                thumbnailUrl={sermon.thumbnailUrl}
                thumbnailAlt={sermon.thumbnailAlt}
                href={`/sermons/${sermon.slug}`}
                hasAudio={sermon.hasAudio}
                hasVideo={Boolean(sermon.video)}
              />
            ))}
          </div>
        )}
        {totalPages > 1 ? (
          <div className="mt-10 flex justify-center gap-3">
            {page > 1 ? (
              <Button asChild variant="outline">
                <Link href={queryString(query, page - 1)}>Previous</Link>
              </Button>
            ) : null}
            {page < totalPages ? (
              <Button asChild variant="outline">
                <Link href={queryString(query, page + 1)}>Next</Link>
              </Button>
            ) : null}
          </div>
        ) : null}
      </Section>
    </div>
  );
}
