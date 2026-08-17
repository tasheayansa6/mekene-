import type { Metadata } from 'next';
import { Construction } from 'lucide-react';

import { Section } from '@/components/layout/Section';
import { EmptyState } from '@/components/shared/EmptyState';

export const metadata: Metadata = {
  title: 'Prayer Requests | Busa Mekenene Eyasus Church',
  description: 'Submit and view prayer requests for the Busa Mekenene Eyasus Church community.',
};

export default function PrayerPage() {
  return (
    <Section>
      <h1 className="mb-8 text-center text-3xl font-bold text-primary md:text-4xl">
        Prayer Requests
      </h1>
      <EmptyState
        icon={<Construction className="size-12" />}
        title="Prayer Requests Coming Soon"
        description="This section is coming soon. Stay tuned for updates."
      />
    </Section>
  );
}
