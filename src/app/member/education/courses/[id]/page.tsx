'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { apiGet, apiPost } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

type CourseDetail = {
  course: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    modules?: Array<{
      id: string;
      title: string;
      lessons: Array<{ id: string; title: string }>;
    }>;
  };
  enrollment: { id: string; status: string; progressPct: number } | null;
};

export default function MemberCourseDetailPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<CourseDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function load() {
    void apiGet<CourseDetail>(`/member/education/courses/${params.id}`).then((result) => {
      if (!result.success) {
        setError(result.message);
        return;
      }
      setData(result.data);
    });
  }

  useEffect(() => {
    if (params.id) load();
  }, [params.id]);

  async function enroll() {
    setBusy(true);
    const result = await apiPost(`/member/education/courses/${params.id}/enroll`, {});
    setBusy(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    load();
  }

  async function completeLesson(lessonId: string) {
    setBusy(true);
    const result = await apiPost(`/member/education/lessons/${lessonId}/complete`, {});
    setBusy(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    load();
  }

  if (!data && !error) return <Skeleton className="h-40 w-full" />;
  if (error && !data) {
    return <p className="text-sm text-destructive">{error}</p>;
  }
  if (!data) return null;

  const active = ['approved', 'enrolled', 'active', 'completed'].includes(
    data.enrollment?.status || ''
  );

  return (
    <div className="space-y-6">
      <div>
        <Link href="/member/education/courses" className="text-sm text-muted-foreground underline">
          Back to courses
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{data.course.title}</h1>
        {data.course.description ? (
          <p className="mt-2 text-sm text-muted-foreground">{data.course.description}</p>
        ) : null}
        {data.enrollment ? (
          <div className="mt-2 flex items-center gap-2 text-sm">
            <Badge variant="secondary">{data.enrollment.status}</Badge>
            <span>{data.enrollment.progressPct}% complete</span>
          </div>
        ) : (
          <Button className="mt-4" disabled={busy} onClick={() => void enroll()}>
            Apply to enroll
          </Button>
        )}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <section>
        <h2 className="mb-3 text-lg font-semibold">Lessons</h2>
        {!data.course.modules?.length ? (
          <p className="text-sm text-muted-foreground">No modules yet.</p>
        ) : (
          <ul className="space-y-4">
            {data.course.modules.map((mod) => (
              <li key={mod.id}>
                <h3 className="font-medium">{mod.title}</h3>
                <ul className="mt-2 space-y-2">
                  {mod.lessons.map((lesson) => (
                    <li
                      key={lesson.id}
                      className="flex items-center justify-between gap-2 text-sm"
                    >
                      <span>{lesson.title}</span>
                      {active ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => void completeLesson(lesson.id)}
                        >
                          Mark complete
                        </Button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
