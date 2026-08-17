import type { Metadata } from 'next';
import { Users } from 'lucide-react';

import { PageHero } from '@/components/sections/PageHero';
import { Section } from '@/components/layout/Section';
import { SectionHeading } from '@/components/sections/SectionHeading';
import { MinistryCard } from '@/components/cards/MinistryCard';
import { ministriesData } from '@/data/ministries';

export const metadata: Metadata = {
  title: 'Our Ministries | Busa Mekenene Eyasus Church',
  description:
    'Explore the various ministries of Busa Mekenene Eyasus Church. From worship and music to youth programs and community outreach, find your place to serve.',
};

export default function MinistriesPage() {
  return (
    <div className="page-transition">
      <PageHero
        title="Our Ministries"
        subtitle="Serve & Grow"
        description="Each ministry is a unique expression of our call to worship God and serve one another in the Ethiopian Orthodox Tewahedo faith."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Ministries' },
        ]}
      />

      {/* Intro Section */}
      <Section>
        <SectionHeading
          icon={Users}
          title="Finding Your Place to Serve"
          description="At Busa Mekenene Eyasus Church, we believe every member is called to serve. Our ministries provide opportunities for spiritual growth, fellowship, and service — each rooted in the rich traditions of the Ethiopian Orthodox Tewahedo Church. Whether you are drawn to worship, education, prayer, or outreach, there is a place for you."
        />
      </Section>

      {/* Ministry Cards Grid */}
      <Section variant="warm">
        <div className="grid gap-6 stagger-fade-in sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {ministriesData.map((ministry) => (
            <MinistryCard
              key={ministry.slug}
              name={ministry.name}
              description={ministry.description}
              leaderName={ministry.leaderName}
              memberCount={ministry.memberCount}
              icon={ministry.icon}
              href={ministry.href}
            />
          ))}
        </div>
      </Section>
    </div>
  );
}
