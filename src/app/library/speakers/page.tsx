import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';

import { PageHero } from '@/components/sections/PageHero';
import { Section } from '@/components/layout/Section';
import { SectionHeading } from '@/components/sections/SectionHeading';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { listPublicSpeakers } from '@/lib/sermons/public';
import { createPageMetadata } from '@/lib/seo';

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  return createPageMetadata({
    title: 'Speakers',
    description: 'Church leaders and speakers with published sermons.',
    path: '/library/speakers',
  });
}

export default async function LibrarySpeakersPage() {
  const speakers = await listPublicSpeakers();

  return (
    <div className="page-transition">
      <PageHero
        title="Speakers"
        subtitle="Teachers & preachers"
        description="Leaders who have published sermons in the church library."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Library', href: '/library' },
          { label: 'Speakers' },
        ]}
      />
      <Section>
        <SectionHeading title="All speakers" align="left" />
        {speakers.length === 0 ? (
          <p className="mt-8 text-center text-muted-foreground">No speakers with published sermons yet.</p>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {speakers.map((speaker) => (
              <Link key={speaker.id} href={speaker.href} className="group block">
                <Card className="h-full transition-colors group-hover:border-primary/30">
                  {speaker.photoUrl ? (
                    <div className="relative aspect-[4/3] overflow-hidden rounded-t-lg">
                      <Image
                        src={speaker.photoUrl}
                        alt={speaker.name}
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                    </div>
                  ) : null}
                  <CardHeader>
                    <CardTitle className="text-base group-hover:text-primary">{speaker.name}</CardTitle>
                    {speaker.title ? (
                      <p className="text-sm text-muted-foreground">{speaker.title}</p>
                    ) : null}
                  </CardHeader>
                  {speaker.bio ? (
                    <CardContent>
                      <p className="line-clamp-3 text-sm text-muted-foreground">{speaker.bio}</p>
                    </CardContent>
                  ) : null}
                </Card>
              </Link>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
