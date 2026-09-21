import type { Metadata } from 'next';
import Link from 'next/link';
import { BookOpen, GraduationCap, Award } from 'lucide-react';
import { PageHero } from '@/components/sections/PageHero';
import { Section } from '@/components/layout/Section';
import { Button } from '@/components/ui/button';
import { createPageMetadata } from '@/lib/seo';
import { listPrograms } from '@/lib/education/programs';
import { listCourses } from '@/lib/education/courses';

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  return createPageMetadata({
    title: 'Church Education',
    description:
      'Bible school programs, courses, and certificates at Busa Mekene Eyasus Church.',
    path: '/education',
  });
}

export default async function EducationHubPage() {
  const [programs, courses] = await Promise.all([
    listPrograms({ publishedOnly: true, pageSize: 6 }),
    listCourses({ publishedOnly: true, pageSize: 6 }),
  ]);

  return (
    <div className="page-transition">
      <PageHero
        title="Church Education"
        subtitle="Bible school & discipleship"
        description="Grow in Scripture through structured programs, courses, and certificates offered by our church education ministry."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Education' },
        ]}
      />

      <Section>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/education/programs">Browse programs</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/education/courses">Browse courses</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/member/education">Member portal</Link>
          </Button>
        </div>
      </Section>

      <Section>
        <div className="mb-6 flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-primary" aria-hidden />
          <h2 className="text-xl font-semibold">Programs</h2>
        </div>
        {programs.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No published programs yet.</p>
        ) : (
          <ul className="space-y-4">
            {programs.items.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/education/programs/${p.slug}`}
                  className="block border-b border-border pb-4 hover:text-primary"
                >
                  <span className="font-medium">{p.name}</span>
                  {p.durationLabel ? (
                    <span className="ml-2 text-sm text-muted-foreground">
                      {p.durationLabel}
                    </span>
                  ) : null}
                  {p.description ? (
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                      {p.description}
                    </p>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-6">
          <Button asChild variant="link" className="px-0">
            <Link href="/education/programs">View all programs</Link>
          </Button>
        </div>
      </Section>

      <Section className="bg-muted/40">
        <div className="mb-6 flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" aria-hidden />
          <h2 className="text-xl font-semibold">Courses</h2>
        </div>
        {courses.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No published courses yet.</p>
        ) : (
          <ul className="space-y-4">
            {courses.items.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/education/courses/${c.slug}`}
                  className="block border-b border-border pb-4 hover:text-primary"
                >
                  <span className="font-medium">{c.title}</span>
                  {c.level ? (
                    <span className="ml-2 text-sm text-muted-foreground">{c.level}</span>
                  ) : null}
                  {c.description ? (
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                      {c.description}
                    </p>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-6">
          <Button asChild variant="link" className="px-0">
            <Link href="/education/courses">View all courses</Link>
          </Button>
        </div>
      </Section>

      <Section>
        <div className="flex items-start gap-3">
          <Award className="mt-0.5 h-5 w-5 text-primary" aria-hidden />
          <div>
            <h2 className="text-lg font-semibold">Verify a certificate</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Have a verification code? Confirm a certificate at{' '}
              <Link href="/verify/certificate/CODE" className="underline">
                /verify/certificate/[code]
              </Link>
              .
            </p>
          </div>
        </div>
      </Section>
    </div>
  );
}
