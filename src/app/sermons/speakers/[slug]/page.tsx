import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';

import { PageHero } from '@/components/sections/PageHero';
import { Section } from '@/components/layout/Section';
import { Button } from '@/components/ui/button';
import { SermonCard } from '@/components/cards/SermonCard';
import { getPublicSpeakerBySlug } from '@/lib/sermons/public';
import { createPageMetadata } from '@/lib/seo';

export const revalidate = 60;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getPublicSpeakerBySlug(slug);
  if (!result) return { title: 'Speaker Not Found' };
  return createPageMetadata({
    title: result.speaker.name,
    description: result.seo.seoDescription,
    path: `/sermons/speakers/${result.speaker.slug}`,
    image: result.speaker.photoUrl || undefined,
  });
}

export default async function SpeakerPage({ params }: PageProps) {
  const { slug } = await params;
  const result = await getPublicSpeakerBySlug(slug);
  if (!result) notFound();
  const { speaker, sermons } = result;

  return (
    <div className="page-transition">
      <PageHero
        title={speaker.name}
        subtitle={speaker.title || 'Speaker'}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Sermons', href: '/sermons' },
          { label: speaker.name },
        ]}
      />
      <Section>
        <div className="mx-auto max-w-3xl">
          <Button variant="ghost" asChild className="mb-6 -ml-2">
            <Link href="/sermons">
              <ArrowLeft className="mr-2 size-4" />
              Back to sermons
            </Link>
          </Button>
          {speaker.photoUrl ? (
            <div className="relative mb-6 aspect-[4/3] max-w-sm overflow-hidden rounded-xl">
              <Image
                src={speaker.photoUrl}
                alt={speaker.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 384px"
              />
            </div>
          ) : null}
          {speaker.bio ? (
            <p className="text-muted-foreground whitespace-pre-wrap">{speaker.bio}</p>
          ) : (
            <p className="text-muted-foreground">Biography will appear when approved by staff.</p>
          )}
        </div>
        <h2 className="mx-auto mt-12 max-w-5xl text-xl font-semibold">Published sermons</h2>
        {sermons.length === 0 ? (
          <p className="mx-auto mt-4 max-w-5xl text-muted-foreground">No published sermons yet.</p>
        ) : (
          <div className="mx-auto mt-6 grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {sermons.map((item) => (
              <SermonCard
                key={item.id}
                href={`/sermons/${item.slug}`}
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
      </Section>
    </div>
  );
}
