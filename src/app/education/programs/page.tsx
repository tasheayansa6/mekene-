import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHero } from '@/components/sections/PageHero';
import { Section } from '@/components/layout/Section';
import { Button } from '@/components/ui/button';
import { createPageMetadata } from '@/lib/seo';
import { listPrograms } from '@/lib/education/programs';

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  return createPageMetadata({
    title: 'Education Programs',
    description: 'Bible school and discipleship programs.',
    path: '/education/programs',
  });
}

export default async function EducationProgramsPage() {
  const { items } = await listPrograms({ publishedOnly: true, pageSize: 100 });

  return (
    <div className="page-transition">
      <PageHero
        title="Programs"
        subtitle="Church education"
        description="Structured Bible school and discipleship pathways."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Education', href: '/education' },
          { label: 'Programs' },
        ]}
      />
      <Section>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No published programs yet.</p>
        ) : (
          <ul className="space-y-6">
            {items.map((p) => (
              <li key={p.id} className="border-b border-border pb-6">
                <h2 className="text-lg font-semibold">
                  <Link href={`/education/programs/${p.slug}`} className="hover:text-primary">
                    {p.name}
                  </Link>
                </h2>
                {p.durationLabel ? (
                  <p className="mt-1 text-sm text-muted-foreground">{p.durationLabel}</p>
                ) : null}
                {p.description ? (
                  <p className="mt-2 text-sm text-muted-foreground">{p.description}</p>
                ) : null}
                <Button asChild variant="link" className="mt-2 px-0">
                  <Link href={`/education/programs/${p.slug}`}>View program</Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
