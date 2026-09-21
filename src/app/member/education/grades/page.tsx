'use client';

import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api/client';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

type Grade = {
  id: string;
  finalScore: number | null;
  letterGrade: string | null;
  status: string;
  feedback: string | null;
  course: { id: string; title: string; slug: string };
};

export default function MemberGradesPage() {
  const [grades, setGrades] = useState<Grade[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void apiGet<{ grades: Grade[] }>('/member/education/grades').then((result) => {
      if (!result.success) {
        setError(result.message);
        setGrades([]);
        return;
      }
      setGrades(result.data?.grades || []);
    });
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Grades</h1>
        <p className="text-sm text-muted-foreground">Your course grade records.</p>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {!grades ? <Skeleton className="h-24 w-full" /> : null}
      {grades && grades.length === 0 ? (
        <p className="text-sm text-muted-foreground">No grades yet.</p>
      ) : null}
      <ul className="space-y-4">
        {(grades || []).map((g) => (
          <li key={g.id} className="border-b pb-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{g.course.title}</span>
              <Badge variant="secondary">{g.status}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {g.finalScore != null ? `Final: ${g.finalScore}` : 'In progress'}
              {g.letterGrade ? ` (${g.letterGrade})` : ''}
            </p>
            {g.feedback ? <p className="mt-1 text-sm">{g.feedback}</p> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
