import type { Metadata } from 'next';
import Link from 'next/link';
import { Podcast, Rss } from 'lucide-react';

import { PageHero } from '@/components/sections/PageHero';
import { Section } from '@/components/layout/Section';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { createPageMetadata } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  return createPageMetadata({
    title: 'Podcast',
    description:
      'Subscribe to the Busa Mekene Eyasus Church sermon podcast via RSS.',
    path: '/podcast',
  });
}

export default function PodcastPage() {
  return (
    <div className="page-transition">
      <PageHero
        title="Sermon Podcast"
        subtitle="Subscribe & listen"
        description="Take sermons with you. Subscribe in your favorite podcast app."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Library', href: '/library' },
          { label: 'Podcast' },
        ]}
      />
      <Section>
        <div className="mx-auto max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Podcast className="size-5" aria-hidden />
                RSS feed
              </CardTitle>
              <CardDescription>
                Our podcast feed includes published sermons with audio. Copy the feed URL into Apple
                Podcasts, Spotify, Pocket Casts, or any RSS reader.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                The feed updates when new sermons are published by church administrators.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild>
                  <a href="/podcast.xml">
                    <Rss className="mr-2 size-4" />
                    Open podcast feed
                  </a>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/library/sermons">Browse sermons</Link>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Feed URL:{' '}
                <code className="rounded bg-muted px-1 py-0.5">/podcast.xml</code>
              </p>
            </CardContent>
          </Card>
        </div>
      </Section>
    </div>
  );
}
