'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { apiGet } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

type Course = {
  id: string;
  title: string;
  status: string;
  enrollmentCount?: number;
};

function InstructorCoursesInner() {
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void apiGet<{ courses: Course[] }>('/instructor/courses').then((result) => {
      if (!result.success) {
        setError(result.message);
        setCourses([]);
        return;
      }
      setCourses(result.data?.courses || []);
    });
  }, []);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Instructor courses</h1>
        <p className="text-sm text-muted-foreground">
          Courses you teach or manage under education permissions.
        </p>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {!courses ? <Skeleton className="h-24 w-full" /> : null}
      {courses && courses.length === 0 ? (
        <p className="text-sm text-muted-foreground">No courses assigned.</p>
      ) : null}
      <ul className="space-y-3">
        {(courses || []).map((c) => (
          <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
            <div>
              <p className="font-medium">{c.title}</p>
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="secondary">{c.status}</Badge>
                {c.enrollmentCount != null ? <span>{c.enrollmentCount} enrollments</span> : null}
              </div>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href={`/education/courses`}>Public catalog</Link>
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function InstructorCoursesPage() {
  return (
    <AuthGuard>
      <InstructorCoursesInner />
    </AuthGuard>
  );
}
