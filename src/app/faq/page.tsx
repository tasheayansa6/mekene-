import type { Metadata } from 'next';
import { HelpCircle } from 'lucide-react';
import { connection } from 'next/server';

import { PageHero } from '@/components/sections/PageHero';
import { Section } from '@/components/layout/Section';
import { SectionHeading } from '@/components/sections/SectionHeading';
import { FaqAccordion } from '@/components/cms/FaqAccordion';
import { createPageMetadata } from '@/lib/seo';

/** Never statically export this page — Prisma needs a runtime DATABASE_URL. */
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  return createPageMetadata({
    title: 'Frequently Asked Questions',
    description: 'Answers to common questions about our church, services, and community.',
    path: '/faq',
  });
}

export default async function FaqPage() {
  // Opt into request-time rendering before any DB import is evaluated.
  await connection();

  let faqs: Array<{
    id: string;
    question: string;
    answer: string;
    category: string;
  }> = [];

  try {
    const { getPublicFaqBundle } = await import('@/lib/cms/search');
    const rows = await getPublicFaqBundle();
    faqs = rows.map((row) => ({
      id: row.id,
      question: row.question,
      answer: row.answer,
      category: row.category ?? 'General',
    }));
  } catch {
    faqs = [];
  }

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
          {faqs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No published FAQs yet.</p>
          ) : (
            <FaqAccordion faqs={faqs} />
          )}
        </div>
      </Section>
    </div>
  );
}
