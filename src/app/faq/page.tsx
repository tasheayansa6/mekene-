import type { Metadata } from 'next';
import { HelpCircle } from 'lucide-react';

import { PageHero } from '@/components/sections/PageHero';
import { Section } from '@/components/layout/Section';
import { SectionHeading } from '@/components/sections/SectionHeading';
import { FaqClientList } from '@/components/cms/FaqClientList';
import { createPageMetadata } from '@/lib/seo';

/**
 * Static-safe FAQ page: no Prisma / db imports.
 * Data loads in the browser via /api/v1/content/faqs.
 * This prevents Vercel `next build` from failing when DATABASE_URL is unset.
 */
export const dynamic = 'force-static';

export async function generateMetadata(): Promise<Metadata> {
  return createPageMetadata({
    title: 'Frequently Asked Questions',
    description: 'Answers to common questions about our church, services, and community.',
    path: '/faq',
  });
}

export default function FaqPage() {
  return (
    <div className="page-transition">
      <PageHero
        title="FAQ"
        subtitle="Help"
        description="Find answers to common questions about our church."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'FAQ' },
        ]}
      />
      <Section>
        <SectionHeading icon={HelpCircle} title="Published questions" />
        <div className="mt-10">
          <FaqClientList />
        </div>
      </Section>
    </div>
  );
}
