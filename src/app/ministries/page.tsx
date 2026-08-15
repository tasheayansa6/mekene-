import type { Metadata } from 'next';
import { Construction } from 'lucide-react';

import { Section } from '@/components/layout/Section';
import { EmptyState } from '@/components/shared/EmptyState';

export const metadata: Metadata = {
  title: 'Our Ministries | Busa Mekenene Eyasus Church',
  description: 'Explore the various ministries of Busa Mekenene Eyasus Church.',
};

export default function MinistriesPage() {
  return (
    <Section>
      <h1 className="mb-8 text-center text-3xl font-bold text-primary md:text-4xl">
        Our Ministries
      </h1>
      <EmptyState
        icon={<Construction className="size-12" />}
        title="Ministries Coming Soon"
        description="This section is coming soon. Stay tuned for updates about our church ministries."
      />
    </Section>
  );
}
