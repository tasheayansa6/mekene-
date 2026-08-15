import type { Metadata } from 'next';
import { Construction } from 'lucide-react';

import { Section } from '@/components/layout/Section';
import { EmptyState } from '@/components/shared/EmptyState';

export const metadata: Metadata = {
  title: 'Admin Dashboard | Busa Mekenene Eyasus Church',
  description: 'Church administration dashboard.',
};

export default function AdminPage() {
  return (
    <Section>
      <h1 className="mb-8 text-center text-3xl font-bold text-primary md:text-4xl">
        Admin Dashboard
      </h1>
      <EmptyState
        icon={<Construction className="size-12" />}
        title="Admin Dashboard Coming Soon"
        description="This section is coming soon. Stay tuned for updates."
      />
    </Section>
  );
}
