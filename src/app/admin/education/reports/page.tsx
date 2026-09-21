'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

type Summary = {
  programs: number;
  courses: number;
  enrollments: number;
  certificatesIssued: number;
  enrollmentsByStatus: Array<{ status: string; count: number }>;
};

export default function AdminEducationReportsPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void apiGet<Summary>('/admin/education/reports').then((result) => {
      if (!result.success) {
        setError(result.message);
        return;
      }
      setSummary(result.data);
    });
  }, []);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Education reports</h1>
          <p className="text-sm text-muted-foreground">Summary counts for programs and enrollments.</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin/education">Back</Link>
        </Button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {!summary ? <Skeleton className="h-32 w-full" /> : null}
      {summary ? (
        <div className="space-y-4">
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-sm text-muted-foreground">Programs</dt>
              <dd className="text-2xl font-semibold">{summary.programs}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Courses</dt>
              <dd className="text-2xl font-semibold">{summary.courses}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Enrollments</dt>
              <dd className="text-2xl font-semibold">{summary.enrollments}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Certificates issued</dt>
              <dd className="text-2xl font-semibold">{summary.certificatesIssued}</dd>
            </div>
          </dl>
          <div>
            <h2 className="mb-2 text-lg font-semibold">Enrollments by status</h2>
            <ul className="space-y-1 text-sm">
              {summary.enrollmentsByStatus.map((row) => (
                <li key={row.status}>
                  {row.status}: {row.count}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}
