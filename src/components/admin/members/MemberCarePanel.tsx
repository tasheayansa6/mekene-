'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api/client';
import { PageHeader } from '@/components/admin/PageHeader';
import { PermissionGate } from '@/components/admin/PermissionGate';
import { ApiErrorAlert } from '@/components/admin/ApiErrorAlert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface CareCase {
  id: string;
  title: string;
  statusLabel: string;
  priorityLabel: string;
  updatedAt: string;
}

interface CareVisit {
  id: string;
  scheduledAt: string;
  statusLabel: string;
  locationLabel: string;
}

interface CareFollowUp {
  id: string;
  task: string;
  dueDate: string | null;
  statusLabel: string;
  caseId: string | null;
}

interface CareNote {
  id: string;
  content: string;
  visibilityLabel: string;
  createdAt: string;
  caseId: string;
  author: { id: string; name: string | null } | null;
}

interface CarePayload {
  memberId: string;
  cases: CareCase[];
  visits: CareVisit[];
  followUps: CareFollowUp[];
  notes: CareNote[];
}

export function MemberCarePanel({ memberId }: { memberId: string }) {
  const [data, setData] = useState<CarePayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void apiGet<CarePayload>(`/admin/members/${memberId}/care`).then((result) => {
      if (!result.success || !result.data) {
        setError(result.message);
        return;
      }
      setData(result.data);
    });
  }, [memberId]);

  if (error) return <ApiErrorAlert message={error} />;
  if (!data) return <Skeleton className="h-72 w-full" />;

  return (
    <PermissionGate permission="pastoral.view">
      <div className="space-y-6">
        <PageHeader
          title="Member pastoral care"
          description="Cases, visits, and follow-ups for this member. Notes appear only when your role allows."
          actions={
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link href={`/admin/members/${memberId}`}>Member profile</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/admin/pastoral-care/cases">All cases</Link>
              </Button>
            </div>
          }
        />

        <Card>
          <CardHeader>
            <CardTitle>Cases</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.cases.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pastoral cases for this member.</p>
            ) : (
              data.cases.map((row) => (
                <div
                  key={row.id}
                  className="flex flex-col gap-2 border-b py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <Link
                      className="font-medium hover:underline"
                      href={`/admin/pastoral-care/cases/${row.id}`}
                    >
                      {row.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {new Date(row.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{row.statusLabel}</Badge>
                    <Badge variant="outline">{row.priorityLabel}</Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Visits</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {data.visits.length === 0 ? (
                <p className="text-muted-foreground">No visits recorded.</p>
              ) : (
                data.visits.map((row) => (
                  <p key={row.id}>
                    {new Date(row.scheduledAt).toLocaleString()} · {row.locationLabel} ·{' '}
                    {row.statusLabel}
                  </p>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Follow-ups</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {data.followUps.length === 0 ? (
                <p className="text-muted-foreground">No follow-ups recorded.</p>
              ) : (
                data.followUps.map((row) => (
                  <p key={row.id}>
                    {row.task}
                    {row.dueDate ? ` · due ${new Date(row.dueDate).toLocaleDateString()}` : ''} ·{' '}
                    {row.statusLabel}
                  </p>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {data.notes.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
              <CardDescription>Returned only for roles with pastoral note access.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.notes.map((note) => (
                <div key={note.id} className="rounded-md border p-3 text-sm">
                  <p className="whitespace-pre-wrap">{note.content}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {note.author?.name || 'Staff'} · {note.visibilityLabel} ·{' '}
                    {new Date(note.createdAt).toLocaleString()}
                    {' · '}
                    <Link className="underline" href={`/admin/pastoral-care/cases/${note.caseId}`}>
                      Case
                    </Link>
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </PermissionGate>
  );
}
