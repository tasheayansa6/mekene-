import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHero } from '@/components/sections/PageHero';
import { Section } from '@/components/layout/Section';
import { Button } from '@/components/ui/button';
import { createPageMetadata } from '@/lib/seo';
import { getProgramBySlug } from '@/lib/education/programs';

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const program = await getProgramBySlug(slug, true);
  if (!program) return { title: 'Program not found' };
  return createPageMetadata({
    title: program.name,
    description: program.description || `${program.name} education program.`,
    path: `/education/programs/${slug}`,
  });
}

export default async function EducationProgramDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const program = await getProgramBySlug(slug, true);
  if (!program) notFound();

  return (
    <div className="page-transition">
      <PageHero
        title={program.name}
        subtitle="Education program"
        description={program.description || undefined}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Education', href: '/education' },
          { label: 'Programs', href: '/education/programs' },
          { label: program.name },
        ]}
      />
      <Section>
        <dl className="space-y-3 text-sm">
          {program.durationLabel ? (
            <div>
              <dt className="font-medium">Duration</dt>
              <dd className="text-muted-foreground">{program.durationLabel}</dd>
            </div>
          ) : null}
          {program.requirements ? (
            <div>
              <dt className="font-medium">Requirements</dt>
              <dd className="whitespace-pre-wrap text-muted-foreground">
                {program.requirements}
              </dd>
            </div>
          ) : null}
          {program.certificateInfo ? (
            <div>
              <dt className="font-medium">Certificate</dt>
              <dd className="whitespace-pre-wrap text-muted-foreground">
                {program.certificateInfo}
              </dd>
            </div>
          ) : null}
        </dl>

        <h2 className="mt-10 text-lg font-semibold">Courses</h2>
        {!program.courses?.length ? (
          <p className="mt-2 text-sm text-muted-foreground">No published courses yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {program.courses.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/education/courses/${c.slug}`}
                  className="font-medium hover:text-primary"
                >
                  {c.title}
                </Link>
                {c.level ? (
                  <span className="ml-2 text-sm text-muted-foreground">{c.level}</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-8">
          <Button asChild variant="outline">
            <Link href="/education/courses">All courses</Link>
          </Button>
        </div>
      </Section>
    </div>
  );
}
