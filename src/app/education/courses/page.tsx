import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHero } from '@/components/sections/PageHero';
import { Section } from '@/components/layout/Section';
import { Button } from '@/components/ui/button';
import { createPageMetadata } from '@/lib/seo';
import { listCourses } from '@/lib/education/courses';

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  return createPageMetadata({
    title: 'Education Courses',
    description: 'Published Bible school and discipleship courses.',
    path: '/education/courses',
  });
}

export default async function EducationCoursesPage() {
  const { items } = await listCourses({ publishedOnly: true, pageSize: 100 });

  return (
    <div className="page-transition">
      <PageHero
        title="Courses"
        subtitle="Church education"
        description="Browse published Bible school and discipleship courses."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Education', href: '/education' },
          { label: 'Courses' },
        ]}
      />
      <Section>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No published courses yet.</p>
        ) : (
          <ul className="space-y-6">
            {items.map((c) => (
              <li key={c.id} className="border-b border-border pb-6">
                <h2 className="text-lg font-semibold">
                  <Link href={`/education/courses/${c.slug}`} className="hover:text-primary">
                    {c.title}
                  </Link>
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {[c.level, c.deliveryType, c.durationLabel].filter(Boolean).join(' · ')}
                </p>
                {c.program ? (
                  <p className="mt-1 text-sm">
                    Program:{' '}
                    <Link
                      href={`/education/programs/${c.program.slug}`}
                      className="underline"
                    >
                      {c.program.name}
                    </Link>
                  </p>
                ) : null}
                {c.description ? (
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-3">
                    {c.description}
                  </p>
                ) : null}
                <Button asChild variant="link" className="mt-2 px-0">
                  <Link href={`/education/courses/${c.slug}`}>View course</Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
