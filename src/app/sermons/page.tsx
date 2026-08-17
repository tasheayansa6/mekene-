import type { Metadata } from 'next';
import { PageHero } from '@/components/sections/PageHero';
import { Section } from '@/components/layout/Section';
import { SermonCard } from '@/components/cards/SermonCard';
import { SermonFilters } from '@/components/sermons/SermonFilters';
import { sermonsData } from '@/data/sermons';

export const metadata: Metadata = {
  title: 'Sermons & Teachings | Busa Mekenene Eyasus Church',
  description:
    'Listen to sermons, Bible studies, and teachings from Busa Mekenene Eyasus Church. Grow in faith through the Word of God.',
};

export default function SermonsPage() {
  return (
    <div className="page-transition">
      <PageHero
        title="Sermons & Teachings"
        subtitle="The Word of God"
        description="Explore sermons, Bible studies, and spiritual teachings from our clergy and ministers, rooted in the Ethiopian Orthodox Tewahedo tradition."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Sermons' },
        ]}
      />

      <Section>
        {/* Filters */}
        <SermonFilters />

        {/* Results count */}
        <p className="mb-8 mt-6 text-sm text-muted-foreground">
          Showing {sermonsData.length} {sermonsData.length === 1 ? 'sermon' : 'sermons'}
        </p>

        {/* Sermon Cards Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {sermonsData.map((sermon) => (
            <SermonCard
              key={sermon.slug}
              title={sermon.title}
              speaker={sermon.speaker}
              date={sermon.date}
              description={sermon.description}
              videoUrl={sermon.videoUrl}
              audioUrl={sermon.audioUrl}
            />
          ))}
        </div>
      </Section>
    </div>
  );
}