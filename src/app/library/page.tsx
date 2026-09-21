import type { Metadata } from 'next';
import Link from 'next/link';
import {
  BookOpen,
  Headphones,
  Layers,
  Library,
  ListMusic,
  Sparkles,
  TrendingUp,
} from 'lucide-react';

import { PageHero } from '@/components/sections/PageHero';
import { Section } from '@/components/layout/Section';
import { SectionHeading } from '@/components/sections/SectionHeading';
import { SermonCard } from '@/components/cards/SermonCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getLibraryHome } from '@/lib/library/public';
import { createPageMetadata } from '@/lib/seo';

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  return createPageMetadata({
    title: 'Digital Library',
    description:
      'Explore sermons, Bible studies, devotionals, playlists, and teaching resources from Busa Mekene Eyasus Church.',
    path: '/library',
  });
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function SermonGrid({
  items,
  hrefPrefix = '/sermons',
}: {
  items: Array<{
    id: string;
    title: string;
    slug: string;
    description: string | null;
    sermonDate: string;
    speakerName: string | null;
    thumbnailUrl: string | null;
    thumbnailAlt: string | null;
    hasAudio: boolean;
    video: unknown;
  }>;
  hrefPrefix?: string;
}) {
  if (items.length === 0) return null;
  return (
    <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <SermonCard
          key={item.id}
          title={item.title}
          speaker={item.speakerName}
          date={formatDate(item.sermonDate)}
          description={item.description}
          thumbnailUrl={item.thumbnailUrl}
          thumbnailAlt={item.thumbnailAlt}
          href={`${hrefPrefix}/${item.slug}`}
          hasAudio={item.hasAudio}
          hasVideo={Boolean(item.video)}
        />
      ))}
    </div>
  );
}

export default async function LibraryHomePage() {
  const data = await getLibraryHome();

  return (
    <div className="page-transition">
      <PageHero
        title="Digital Library"
        subtitle="Watch, listen, and grow"
        description="Sermons, Bible studies, devotionals, curated playlists, and teaching resources — all in one place."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Library' },
        ]}
      />

      <Section variant="warm">
        <div className="mx-auto flex max-w-4xl flex-wrap justify-center gap-3">
          <Button asChild variant="secondary">
            <Link href="/library/sermons">
              <Headphones className="mr-2 size-4" />
              Sermons
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/bible-study">Bible studies</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/devotionals">Devotionals</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/library/playlists">Playlists</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/library/search">Search</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/podcast">Podcast</Link>
          </Button>
        </div>
      </Section>

      {data.featuredSermon ? (
        <Section>
          <SectionHeading
            icon={Sparkles}
            title="Featured"
            align="left"
            description="Highlighted teaching from the church library."
          />
          <div className="mx-auto max-w-3xl">
            <SermonCard
              title={data.featuredSermon.title}
              speaker={data.featuredSermon.speakerName}
              date={formatDate(data.featuredSermon.sermonDate)}
              description={data.featuredSermon.description}
              thumbnailUrl={data.featuredSermon.thumbnailUrl}
              thumbnailAlt={data.featuredSermon.thumbnailAlt}
              href={`/sermons/${data.featuredSermon.slug}`}
              hasAudio={data.featuredSermon.hasAudio}
              hasVideo={Boolean(data.featuredSermon.video)}
            />
          </div>
        </Section>
      ) : null}

      <Section>
        <SectionHeading icon={BookOpen} title="Latest sermons" align="left" />
        {data.latestSermons.length === 0 ? (
          <p className="mt-6 text-center text-muted-foreground">No sermons published yet.</p>
        ) : (
          <SermonGrid items={data.latestSermons} />
        )}
        <div className="mt-8 text-center">
          <Button asChild variant="outline">
            <Link href="/library/sermons">Browse all sermons</Link>
          </Button>
        </div>
      </Section>

      <Section variant="muted">
        <SectionHeading icon={TrendingUp} title="Popular" align="left" />
        <SermonGrid items={data.popular} />
      </Section>

      <Section>
        <SectionHeading icon={Layers} title="Bible studies" align="left" />
        {data.bibleStudies.length === 0 ? (
          <p className="mt-6 text-muted-foreground">No Bible studies published yet.</p>
        ) : (
          <SermonGrid items={data.bibleStudies} hrefPrefix="/bible-study" />
        )}
        <div className="mt-8">
          <Button asChild variant="outline" size="sm">
            <Link href="/bible-study">All Bible studies</Link>
          </Button>
        </div>
      </Section>

      <Section variant="muted">
        <SectionHeading icon={Library} title="Devotionals" align="left" />
        {data.devotionals.length === 0 ? (
          <p className="mt-6 text-muted-foreground">No devotionals published yet.</p>
        ) : (
          <SermonGrid items={data.devotionals} hrefPrefix="/devotionals" />
        )}
        <div className="mt-8">
          <Button asChild variant="outline" size="sm">
            <Link href="/devotionals">All devotionals</Link>
          </Button>
        </div>
      </Section>

      {data.featuredPlaylists.length > 0 ? (
        <Section>
          <SectionHeading icon={ListMusic} title="Featured playlists" align="left" />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.featuredPlaylists.map((playlist) => (
              <Card key={playlist.id} className="transition-colors hover:border-primary/30">
                <CardHeader>
                  <CardTitle className="text-base">
                    <Link className="hover:text-primary" href={playlist.href}>
                      {playlist.title}
                    </Link>
                  </CardTitle>
                  {playlist.description ? (
                    <CardDescription className="line-clamp-2">{playlist.description}</CardDescription>
                  ) : null}
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    {playlist.itemCount} item{playlist.itemCount === 1 ? '' : 's'}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="mt-8">
            <Button asChild variant="outline" size="sm">
              <Link href="/library/playlists">All playlists</Link>
            </Button>
          </div>
        </Section>
      ) : null}

      {data.categories.length > 0 ? (
        <Section variant="muted">
          <SectionHeading title="Categories" align="left" />
          <div className="mt-6 flex flex-wrap gap-2">
            {data.categories.map((category) => (
              <Button key={category.id} asChild size="sm" variant="outline">
                <Link href={`/library/sermons?category=${category.slug}`}>{category.name}</Link>
              </Button>
            ))}
          </div>
        </Section>
      ) : null}
    </div>
  );
}
