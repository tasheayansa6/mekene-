import type { Metadata } from 'next';
import Link from 'next/link';
import { BookOpen } from 'lucide-react';

import { PageHero } from '@/components/sections/PageHero';
import { Section } from '@/components/layout/Section';
import { SectionHeading } from '@/components/sections/SectionHeading';
import { SermonCard } from '@/components/cards/SermonCard';
import { Button } from '@/components/ui/button';
import { getPublicSermonList } from '@/lib/sermons/public';
import { createPageMetadata } from '@/lib/seo';

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  return createPageMetadata({
    title: 'Devotionals',
    description: 'Daily devotionals and short reflections published by the church.',
    path: '/devotionals',
  });
}

export default async function DevotionalsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page || 1) || 1);
  const q = typeof params.q === 'string' ? params.q : undefined;
  const result = await getPublicSermonList({
    contentType: 'devotion',
    q,
    page,
    pageSize: 12,
  });

  return (
    <div className="page-transition">
      <PageHero
        title="Devotionals"
        subtitle="Grow"
        description="Short devotional content published for daily encouragement."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Devotionals' },
        ]}
      />
      <Section>
        <SectionHeading icon={BookOpen} title="Published devotionals" />
        {result.sermons.length === 0 ? (
          <p className="mx-auto mt-8 max-w-2xl text-center text-muted-foreground">
            No devotionals are published yet. You can also browse{' '}
            <Link href="/bible-study" className="text-primary hover:underline">
              Bible study
            </Link>{' '}
            content.
          </p>
        ) : (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {result.sermons.map((item) => (
              <SermonCard
                key={item.id}
                href={`/devotionals/${item.slug}`}
                title={item.title}
                date={item.sermonDate}
                speaker={item.speakerName}
                description={item.description}
                thumbnailUrl={item.thumbnailUrl}
                hasAudio={item.hasAudio}
                hasVideo={Boolean(item.video)}
              />
            ))}
          </div>
        )}
        <div className="mt-10 flex justify-center gap-3">
          <Button asChild variant="outline">
            <Link href="/sermons">All sermons</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/bible-study">Bible study</Link>
          </Button>
        </div>
      </Section>
    </div>
  );
}
