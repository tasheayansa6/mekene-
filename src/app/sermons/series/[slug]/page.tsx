import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { PageHero } from '@/components/sections/PageHero';
import { Section } from '@/components/layout/Section';
import { SermonCard } from '@/components/cards/SermonCard';
import { Button } from '@/components/ui/button';
import { MarkdownContent } from '@/components/content/MarkdownContent';
import { getPublicSeriesBySlug } from '@/lib/sermons/public';
import { createPageMetadata } from '@/lib/seo';

export const revalidate = 60;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getPublicSeriesBySlug(slug);
  if (!result) return { title: 'Series Not Found' };
  return createPageMetadata({
    title: result.seo.seoTitle,
    description: result.seo.seoDescription,
    path: `/sermons/series/${result.series.slug}`,
    image: result.seo.ogImage || undefined,
  });
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default async function SeriesPage({ params }: PageProps) {
  const { slug } = await params;
  const result = await getPublicSeriesBySlug(slug);
  if (!result) notFound();
  const { series, sermons } = result;

  return (
    <div className="page-transition">
      <PageHero
        title={series.name}
        subtitle="Sermon series"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Sermons', href: '/sermons' },
          { label: series.name },
        ]}
      />
      <Section>
        <Button variant="ghost" asChild className="mb-8 -ml-2">
          <Link href="/sermons">
            <ArrowLeft className="mr-2 size-4" />
            All sermons
          </Link>
        </Button>
        {series.imageUrl ? (
          <div className="relative mx-auto mb-8 aspect-[16/9] max-w-3xl overflow-hidden rounded-xl">
            <Image
              src={series.imageUrl}
              alt={series.imageAlt || series.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 48rem"
            />
          </div>
        ) : null}
        {series.description ? (
          <div className="mx-auto max-w-3xl">
            <MarkdownContent content={series.description} />
          </div>
        ) : null}
        {sermons.length === 0 ? (
          <p className="mx-auto mt-10 max-w-2xl text-center text-muted-foreground">
            No sermons available yet. Please check back soon.
          </p>
        ) : (
          <div className="mx-auto mt-10 grid max-w-6xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {sermons.map((sermon) => (
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
      </Section>
    </div>
  );
}
