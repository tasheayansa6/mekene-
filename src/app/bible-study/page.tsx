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
    title: 'Bible Study',
    description:
      'Published Bible study lessons and teaching resources from Busa Mekene Eyasus Church.',
    path: '/bible-study',
  });
}

export default async function BibleStudyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page || 1) || 1);
  const q = typeof params.q === 'string' ? params.q : undefined;
  const result = await getPublicSermonList({
    contentType: 'bible_study',
    q,
    page,
    pageSize: 12,
  });

  return (
    <div className="page-transition">
      <PageHero
        title="Bible Study"
        subtitle="Learn"
        description="Study lessons and teaching content published by the church. Draft content never appears here."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Bible Study' },
        ]}
      />
      <Section>
        <SectionHeading icon={BookOpen} title="Published studies" />
        {result.sermons.length === 0 ? (
          <p className="mx-auto mt-8 max-w-2xl text-center text-muted-foreground">
            No Bible study lessons are published yet.
          </p>
        ) : (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {result.sermons.map((item) => (
              <SermonCard
                key={item.id}
                href={`/bible-study/${item.slug}`}
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
            <Link href="/resources">Resources</Link>
          </Button>
        </div>
      </Section>
    </div>
  );
}
