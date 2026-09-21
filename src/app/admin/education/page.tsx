'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPost, apiPatch } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

type Program = { id: string; name: string; slug: string; status: string; courseCount?: number };
type Course = {
  id: string;
  title: string;
  slug: string;
  status: string;
  program?: { name: string } | null;
};
type Enrollment = {
  id: string;
  status: string;
  course?: { title: string } | null;
  member?: { displayName: string | null; membershipNumber: string | null } | null;
};

export default function AdminEducationPage() {
  const [programs, setPrograms] = useState<Program[] | null>(null);
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[] | null>(null);
  const [programName, setProgramName] = useState('');
  const [courseTitle, setCourseTitle] = useState('');
  const [error, setError] = useState<string | null>(null);

  function load() {
    void apiGet<Program[]>('/admin/education/programs').then((result) => {
      if (!result.success) return;
      setPrograms(Array.isArray(result.data) ? result.data : []);
    });
    void apiGet<Course[]>('/admin/education/courses').then((result) => {
      if (!result.success) return;
      setCourses(Array.isArray(result.data) ? result.data : []);
    });
    void apiGet<Enrollment[]>('/admin/education/enrollments').then((result) => {
      if (!result.success) return;
      setEnrollments(Array.isArray(result.data) ? result.data : []);
    });
  }

  useEffect(() => {
    load();
  }, []);

  async function createProgram() {
    if (!programName.trim()) return;
    const result = await apiPost('/admin/education/programs', { name: programName.trim() });
    if (!result.success) {
      setError(result.message);
      return;
    }
    setProgramName('');
    load();
  }

  async function createCourse() {
    if (!courseTitle.trim()) return;
    const result = await apiPost('/admin/education/courses', { title: courseTitle.trim() });
    if (!result.success) {
      setError(result.message);
      return;
    }
    setCourseTitle('');
    load();
  }

  async function setStatus(id: string, status: string) {
    const result = await apiPatch('/admin/education/enrollments', { id, status });
    if (!result.success) {
      setError(result.message);
      return;
    }
    load();
  }

  return (
    <div className="space-y-8 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Education</h1>
          <p className="text-sm text-muted-foreground">
            Programs, courses, enrollments, and reports.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin/education/reports">Reports</Link>
        </Button>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Programs</h2>
        <div className="flex gap-2">
          <Input
            placeholder="New program name"
            value={programName}
            onChange={(e) => setProgramName(e.target.value)}
          />
          <Button onClick={() => void createProgram()}>Create</Button>
        </div>
        {!programs ? <Skeleton className="h-16 w-full" /> : null}
        <ul className="space-y-2">
          {(programs || []).map((p) => (
            <li key={p.id} className="flex items-center gap-2 text-sm">
              <span className="font-medium">{p.name}</span>
              <Badge variant="secondary">{p.status}</Badge>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Courses</h2>
        <div className="flex gap-2">
          <Input
            placeholder="New course title"
            value={courseTitle}
            onChange={(e) => setCourseTitle(e.target.value)}
          />
          <Button onClick={() => void createCourse()}>Create</Button>
        </div>
        {!courses ? <Skeleton className="h-16 w-full" /> : null}
        <ul className="space-y-2">
          {(courses || []).map((c) => (
            <li key={c.id} className="flex items-center gap-2 text-sm">
              <span className="font-medium">{c.title}</span>
              <Badge variant="secondary">{c.status}</Badge>
              {c.program?.name ? (
                <span className="text-muted-foreground">{c.program.name}</span>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Enrollments</h2>
        {!enrollments ? <Skeleton className="h-16 w-full" /> : null}
        <ul className="space-y-3">
          {(enrollments || []).map((e) => (
            <li key={e.id} className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium">
                {e.member?.displayName || e.member?.membershipNumber || 'Member'}
              </span>
              <span className="text-muted-foreground">{e.course?.title}</span>
              <Badge variant="secondary">{e.status}</Badge>
              {e.status === 'application' || e.status === 'pending' ? (
                <>
                  <Button size="sm" variant="outline" onClick={() => void setStatus(e.id, 'approved')}>
                    Approve
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => void setStatus(e.id, 'rejected')}>
                    Reject
                  </Button>
                </>
              ) : null}
              {e.status === 'approved' ? (
                <Button size="sm" variant="outline" onClick={() => void setStatus(e.id, 'enrolled')}>
                  Enroll
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
