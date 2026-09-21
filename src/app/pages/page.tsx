import type { Metadata } from 'next';
import Link from 'next/link';
import { FileText } from 'lucide-react';

import { PageHero } from '@/components/sections/PageHero';
import { Section } from '@/components/layout/Section';
import { SectionHeading } from '@/components/sections/SectionHeading';
import { db } from '@/lib/db';
import { promoteScheduledContent } from '@/lib/content/query';
import { publicStatusWhere } from '@/lib/content/status';
import { createPageMetadata } from '@/lib/seo';

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  return createPageMetadata({
    title: 'Pages',
    description: 'Published website pages from the church CMS.',
    path: '/pages',
  });
}

export default async function CmsPagesIndexPage() {
  await promoteScheduledContent();
  const pages = await db.cmsPage.findMany({
    where: publicStatusWhere(),
    orderBy: { title: 'asc' },
    select: { title: true, slug: true, excerpt: true },
  });

  return (
    <div className="page-transition">
      <PageHero
        title="Pages"
        description="Published content pages."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Pages' },
        ]}
      />
      <Section>
        <SectionHeading icon={FileText} title="All pages" />
        {pages.length === 0 ? (
          <p className="mx-auto mt-8 max-w-2xl text-center text-muted-foreground">
            No published pages yet.
          </p>
        ) : (
          <ul className="mx-auto mt-10 max-w-2xl divide-y rounded-lg border">
            {pages.map((page) => (
              <li key={page.slug}>
                <Link
                  href={`/pages/${page.slug}`}
                  className="block p-4 transition-colors hover:bg-muted/40"
                >
                  <h2 className="font-semibold text-primary">{page.title}</h2>
                  {page.excerpt ? (
                    <p className="mt-1 text-sm text-muted-foreground">{page.excerpt}</p>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
