import type { Metadata } from 'next';
import { Construction } from 'lucide-react';

import { Section } from '@/components/layout/Section';
import { EmptyState } from '@/components/shared/EmptyState';

export const metadata: Metadata = {
  title: 'Resources | Busa Mekenene Eyasus Church',
  description: 'Spiritual resources and materials from Busa Mekenene Eyasus Church.',
};

export default function ResourcesPage() {
  return (
    <Section>
      <h1 className="mb-8 text-center text-3xl font-bold text-primary md:text-4xl">
        Resources
      </h1>
      <EmptyState
        icon={<Construction className="size-12" />}
        title="Resources Coming Soon"
        description="This section is coming soon. Stay tuned for updates."
      />
    </Section>
  );
}
