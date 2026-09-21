import type { Metadata } from 'next';
import Link from 'next/link';

import { PageHero } from '@/components/sections/PageHero';
import { Section } from '@/components/layout/Section';
import { SectionHeading } from '@/components/sections/SectionHeading';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getPublicSermonList } from '@/lib/sermons/public';
import { createPageMetadata } from '@/lib/seo';

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  return createPageMetadata({
    title: 'Sermon Series',
    description: 'Browse sermon series from Busa Mekene Eyasus Church.',
    path: '/library/series',
  });
}

export default async function LibrarySeriesPage() {
  const result = await getPublicSermonList({ pageSize: 1 });

  return (
    <div className="page-transition">
      <PageHero
        title="Sermon Series"
        subtitle="Collections"
        description="Teaching series grouped for deeper study."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Library', href: '/library' },
          { label: 'Series' },
        ]}
      />
      <Section>
        <SectionHeading title="All series" align="left" />
        {result.series.length === 0 ? (
          <p className="mt-8 text-center text-muted-foreground">No series published yet.</p>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {result.series.map((item) => (
              <Card key={item.slug}>
                <CardHeader>
                  <CardTitle className="text-base">
                    <Link className="hover:text-primary" href={`/sermons/series/${item.slug}`}>
                      {item.name}
                    </Link>
                  </CardTitle>
                  <CardDescription>Published sermon series</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/sermons/series/${item.slug}`}>View series</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
