import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Section } from '@/components/layout/Section';
import { PageHero } from '@/components/sections/PageHero';
import { PrayButton } from '@/components/prayer/PrayButton';
import { getPublicPrayerById } from '@/lib/prayer/public';
import { prayerPageRobots } from '@/lib/prayer/seo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const row = await getPublicPrayerById(id);
  return {
    title: row ? row.title : 'Prayer request',
    robots: await prayerPageRobots(),
  };
}

export default async function PublicPrayerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const row = await getPublicPrayerById(id);
  if (!row) notFound();

  return (
    <div className="page-transition">
      <PageHero
        title={row.title}
        subtitle="Public prayer request"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Prayer', href: '/prayer' },
          { label: row.title },
        ]}
      />
      <Section>
        <article className="mx-auto max-w-2xl space-y-6">
          {row.category ? (
            <p className="text-sm text-muted-foreground">{row.category.name}</p>
          ) : null}
          <p className="whitespace-pre-wrap text-lg leading-relaxed">{row.content}</p>
          <PrayButton requestId={row.id} initialCount={row.prayedCount} />
        </article>
      </Section>
    </div>
  );
}
