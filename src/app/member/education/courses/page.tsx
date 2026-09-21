'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPost } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

type Enrollment = {
  id: string;
  courseId: string;
  status: string;
  progressPct: number;
  course: { id: string; title: string; slug: string; status: string } | null;
};

type Course = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  level: string | null;
};

export default function MemberEducationCoursesPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[] | null>(null);
  const [available, setAvailable] = useState<Course[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function load() {
    void apiGet<{ enrollments: Enrollment[]; availableCourses: Course[] }>(
      '/member/education/courses'
    ).then((result) => {
      if (!result.success) {
        setError(result.message);
        setEnrollments([]);
        return;
      }
      setEnrollments(result.data?.enrollments || []);
      setAvailable(result.data?.availableCourses || []);
    });
  }

  useEffect(() => {
    load();
  }, []);

  async function enroll(courseId: string) {
    setBusyId(courseId);
    const result = await apiPost(`/member/education/courses/${courseId}/enroll`, {});
    setBusyId(null);
    if (!result.success) {
      setError(result.message);
      return;
    }
    load();
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My courses</h1>
        <p className="text-sm text-muted-foreground">
          Track enrollments and apply to published courses.
        </p>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <section>
        <h2 className="mb-3 text-lg font-semibold">Enrolled</h2>
        {!enrollments ? <Skeleton className="h-24 w-full" /> : null}
        {enrollments && enrollments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No enrollments yet.</p>
        ) : null}
        <ul className="space-y-3">
          {(enrollments || []).map((e) => (
            <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
              <div>
                <Link
                  href={`/member/education/courses/${e.courseId}`}
                  className="font-medium hover:text-primary"
                >
                  {e.course?.title || 'Course'}
                </Link>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="secondary">{e.status}</Badge>
                  <span>{e.progressPct}% complete</span>
                </div>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link href={`/member/education/courses/${e.courseId}`}>Open</Link>
              </Button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Available</h2>
        {available.length === 0 ? (
          <p className="text-sm text-muted-foreground">No additional courses available.</p>
        ) : (
          <ul className="space-y-3">
            {available.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                <div>
                  <p className="font-medium">{c.title}</p>
                  {c.level ? (
                    <p className="text-xs text-muted-foreground">{c.level}</p>
                  ) : null}
                </div>
                <Button
                  size="sm"
                  disabled={busyId === c.id}
                  onClick={() => void enroll(c.id)}
                >
                  Apply
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
