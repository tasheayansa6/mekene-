import type { Metadata } from 'next';
import { Construction } from 'lucide-react';

import { Section } from '@/components/layout/Section';
import { EmptyState } from '@/components/shared/EmptyState';

export const metadata: Metadata = {
  title: 'Member Portal | Busa Mekenene Eyasus Church',
  description: 'Access your member dashboard and resources.',
};

export default function MemberPage() {
  return (
    <Section>
      <h1 className="mb-8 text-center text-3xl font-bold text-primary md:text-4xl">
        Member Portal
      </h1>
      <EmptyState
        icon={<Construction className="size-12" />}
        title="Member Portal Coming Soon"
        description="This section is coming soon. Stay tuned for updates."
      />
    </Section>
  );
}
