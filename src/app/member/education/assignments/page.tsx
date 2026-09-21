'use client';

import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';

type Assignment = {
  id: string;
  title: string;
  instructions: string | null;
  dueAt: string | null;
  maxScore: number;
  course: { id: string; title: string; slug: string };
  submission: {
    id: string;
    status: string;
    score: number | null;
    feedback: string | null;
    submittedAt: string;
  } | null;
};

export default function MemberAssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function load() {
    void apiGet<{ assignments: Assignment[] }>('/member/education/assignments').then(
      (result) => {
        if (!result.success) {
          setError(result.message);
          setAssignments([]);
          return;
        }
        setAssignments(result.data?.assignments || []);
      }
    );
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(id: string) {
    const textBody = drafts[id]?.trim();
    if (!textBody) {
      setError('Enter submission text first.');
      return;
    }
    setBusyId(id);
    const result = await apiPost(`/member/education/assignments/${id}/submit`, { textBody });
    setBusyId(null);
    if (!result.success) {
      setError(result.message);
      return;
    }
    setDrafts((prev) => ({ ...prev, [id]: '' }));
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Assignments</h1>
        <p className="text-sm text-muted-foreground">
          Work for courses you are enrolled in.
        </p>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {!assignments ? <Skeleton className="h-32 w-full" /> : null}
      {assignments && assignments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No assignments yet.</p>
      ) : null}
      <ul className="space-y-6">
        {(assignments || []).map((a) => (
          <li key={a.id} className="border-b pb-6">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-semibold">{a.title}</h2>
              {a.submission ? <Badge variant="secondary">{a.submission.status}</Badge> : null}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{a.course.title}</p>
            {a.dueAt ? (
              <p className="text-xs text-muted-foreground">
                Due {new Date(a.dueAt).toLocaleString()}
              </p>
            ) : null}
            {a.instructions ? (
              <p className="mt-2 whitespace-pre-wrap text-sm">{a.instructions}</p>
            ) : null}
            {a.submission?.feedback ? (
              <p className="mt-2 text-sm">Feedback: {a.submission.feedback}</p>
            ) : null}
            {a.submission?.score != null ? (
              <p className="text-sm">
                Score: {a.submission.score}/{a.maxScore}
              </p>
            ) : null}
            <Textarea
              className="mt-3"
              rows={3}
              placeholder="Your submission…"
              value={drafts[a.id] || ''}
              onChange={(e) => setDrafts((prev) => ({ ...prev, [a.id]: e.target.value }))}
            />
            <Button
              className="mt-2"
              size="sm"
              disabled={busyId === a.id}
              onClick={() => void submit(a.id)}
            >
              Submit
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
