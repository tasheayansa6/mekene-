import type { Metadata } from 'next';
import { Construction } from 'lucide-react';

import { Section } from '@/components/layout/Section';
import { EmptyState } from '@/components/shared/EmptyState';

export const metadata: Metadata = {
  title: 'Giving & Donations | Busa Mekenene Eyasus Church',
  description: 'Support the mission of Busa Mekenene Eyasus Church through giving.',
};

export default function GivingPage() {
  return (
    <Section>
      <h1 className="mb-8 text-center text-3xl font-bold text-primary md:text-4xl">
        Giving & Donations
      </h1>
      <EmptyState
        icon={<Construction className="size-12" />}
        title="Giving Coming Soon"
        description="This section is coming soon. Stay tuned for updates."
      />
    </Section>
  );
}
