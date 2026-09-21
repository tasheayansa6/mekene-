import type { Metadata } from 'next';
import { HelpCircle } from 'lucide-react';

import { PageHero } from '@/components/sections/PageHero';
import { Section } from '@/components/layout/Section';
import { SectionHeading } from '@/components/sections/SectionHeading';
import { FaqAccordion } from '@/components/cms/FaqAccordion';
import { getPublicFaqBundle } from '@/lib/cms/search';
import { createPageMetadata } from '@/lib/seo';

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  return createPageMetadata({
    title: 'Frequently Asked Questions',
    description: 'Answers to common questions about our church, services, and community.',
    path: '/faq',
  });
}

export default async function FaqPage() {
  const faqs = await getPublicFaqBundle();

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
          <FaqAccordion faqs={faqs} />
        </div>
      </Section>
    </div>
  );
}
