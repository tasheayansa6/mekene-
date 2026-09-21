import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHero } from '@/components/sections/PageHero';
import { Section } from '@/components/layout/Section';
import { Button } from '@/components/ui/button';
import { createPageMetadata } from '@/lib/seo';
import { getCourseBySlug } from '@/lib/education/courses';

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const course = await getCourseBySlug(slug, { publishedOnly: true });
  if (!course) return { title: 'Course not found' };
  return createPageMetadata({
    title: course.title,
    description: course.description || `${course.title} course.`,
    path: `/education/courses/${slug}`,
  });
}

export default async function EducationCourseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const course = await getCourseBySlug(slug, {
    publishedOnly: true,
    includeModules: true,
    publishedLessonsOnly: true,
  });
  if (!course) notFound();

  return (
    <div className="page-transition">
      <PageHero
        title={course.title}
        subtitle="Education course"
        description={course.description || undefined}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Education', href: '/education' },
          { label: 'Courses', href: '/education/courses' },
          { label: course.title },
        ]}
      />
      <Section>
        <p className="text-sm text-muted-foreground">
          {[course.level, course.deliveryType, course.durationLabel]
            .filter(Boolean)
            .join(' · ')}
        </p>
        {course.program ? (
          <p className="mt-2 text-sm">
            Program:{' '}
            <Link href={`/education/programs/${course.program.slug}`} className="underline">
              {course.program.name}
            </Link>
          </p>
        ) : null}
        {course.instructor ? (
          <p className="mt-1 text-sm text-muted-foreground">
            Instructor: {course.instructor.name}
          </p>
        ) : null}

        <div className="mt-6">
          <Button asChild>
            <Link href={`/member/education/courses/${course.id}`}>Enroll / open in portal</Link>
          </Button>
        </div>

        <h2 className="mt-10 text-lg font-semibold">Modules</h2>
        {!course.modules?.length ? (
          <p className="mt-2 text-sm text-muted-foreground">No modules published yet.</p>
        ) : (
          <ul className="mt-4 space-y-6">
            {course.modules.map((mod) => (
              <li key={mod.id}>
                <h3 className="font-medium">{mod.title}</h3>
                {mod.description ? (
                  <p className="mt-1 text-sm text-muted-foreground">{mod.description}</p>
                ) : null}
                {mod.lessons?.length ? (
                  <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
                    {mod.lessons.map((lesson) => (
                      <li key={lesson.id}>{lesson.title}</li>
                    ))}
                  </ol>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
