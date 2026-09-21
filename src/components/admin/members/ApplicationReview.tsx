'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { apiGet, apiPost } from '@/lib/api/client';
import { useAuth } from '@/components/providers/AuthProvider';
import { PageHeader } from '@/components/admin/PageHeader';
import { PermissionGate } from '@/components/admin/PermissionGate';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { ApiErrorAlert } from '@/components/admin/ApiErrorAlert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { publicErrorMessage } from '@/lib/admin/http-error';

interface ApplicationDetail {
  id: string;
  status: string;
  statusLabel: string;
  fullName: string;
  preferredContact: string | null;
  preferredLanguage: string;
  howHeard: string | null;
  ministryInterests: string | null;
  applicantNote: string | null;
  reviewerMessage: string | null;
  reviewNotes: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  reviewedBy: { id: string; name: string } | null;
  member: { id: string; membershipNumber: string | null; status: string } | null;
  account: {
    id: string;
    email?: string;
    firstName: string;
    lastName: string;
    phone: string | null;
  } | null;
  history: Array<{
    id: string;
    oldStatus: string | null;
    newStatus: string;
    reason: string | null;
    createdAt: string;
    changedBy: { id: string; name: string } | null;
  }>;
}

export function ApplicationReview({ id }: { id: string }) {
  const { can } = useAuth();
  const [row, setRow] = useState<ApplicationDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState('');
  const [confirm, setConfirm] = useState<'approve' | 'reject' | 'info' | 'archive' | null>(null);
  const [pending, setPending] = useState(false);

  function load() {
    void apiGet<{ application: ApplicationDetail }>(`/admin/members/applications/${id}`).then((result) => {
      if (!result.success || !result.data?.application) {
        setError(result.message);
        return;
      }
      setRow(result.data.application);
      setNotes(result.data.application.reviewNotes || '');
      setMessage(result.data.application.reviewerMessage || '');
    });
  }

  useEffect(() => {
    load();
  }, [id]);

  async function run(action: 'approve' | 'reject' | 'info' | 'archive') {
    setPending(true);
    const path =
      action === 'approve'
        ? `/admin/members/applications/${id}/approve`
        : action === 'reject'
          ? `/admin/members/applications/${id}/reject`
          : action === 'info'
            ? `/admin/members/applications/${id}/request-information`
            : `/admin/members/applications/${id}/archive`;
    const result = await apiPost(path, {
      notes,
      message: action === 'info' ? message : undefined,
    });
    setPending(false);
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    toast.success(result.message || 'Updated.');
    load();
  }

  if (error) return <ApiErrorAlert message={error} />;
  if (!row) return <Skeleton className="h-72 w-full" />;

  return (
    <PermissionGate permission="members.moderate">
      <div className="space-y-6">
        <PageHeader
          title={row.fullName}
          description={`Application ${row.statusLabel}`}
        />
        <Badge>{row.statusLabel}</Badge>

        <Card>
          <CardHeader>
            <CardTitle>Submitted information</CardTitle>
            <CardDescription>Submitted {new Date(row.submittedAt).toLocaleString()}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Preferred contact: {row.preferredContact || '—'}</p>
            <p>Preferred language: {row.preferredLanguage}</p>
            <p>How they heard: {row.howHeard || '—'}</p>
            <p>Ministry interests: {row.ministryInterests || '—'}</p>
            <p>Applicant note: {row.applicantNote || '—'}</p>
            {row.account ? <p>Account email: {row.account.email}</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Review</CardTitle>
            <CardDescription>Internal notes are not shown to the applicant.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="review-notes">Internal notes</Label>
              <Textarea id="review-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reviewer-message">Message to applicant</Label>
              <Textarea
                id="reviewer-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Required when requesting more information"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {can('members.approve') ? (
                <Button onClick={() => setConfirm('approve')}>Approve</Button>
              ) : null}
              <Button variant="outline" onClick={() => setConfirm('info')}>
                Request information
              </Button>
              <Button variant="destructive" onClick={() => setConfirm('reject')}>
                Decline
              </Button>
              {can('members.archive') ? (
                <Button variant="ghost" onClick={() => setConfirm('archive')}>
                  Archive
                </Button>
              ) : null}
            </div>
            {row.member ? (
              <Button asChild variant="link">
                <Link href={`/admin/members/${row.member.id}`}>Open member record</Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status history</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2 text-sm">
              {row.history.map((item) => (
                <li key={item.id}>
                  {item.oldStatus || '—'} → {item.newStatus}
                  {item.changedBy ? ` · ${item.changedBy.name}` : ''} ·{' '}
                  {new Date(item.createdAt).toLocaleString()}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <ConfirmDialog
          open={confirm !== null}
          title={
            confirm === 'approve'
              ? 'Approve this application?'
              : confirm === 'reject'
                ? 'Decline this application?'
                : confirm === 'info'
                  ? 'Request additional information?'
                  : 'Archive this application?'
          }
          description={
            confirm === 'approve'
              ? 'This creates or activates a church membership record. It does not grant administrator permissions.'
              : confirm === 'reject'
                ? 'The applicant will see that the application was not approved. Internal notes stay private.'
                : confirm === 'info'
                  ? 'The applicant can update the application. Original history is kept.'
                  : 'Archived applications stay in the record and are not deleted.'
          }
          confirmLabel="Confirm"
          loading={pending}
          destructive={confirm === 'reject' || confirm === 'archive'}
          onConfirm={() => {
            if (confirm) void run(confirm);
            setConfirm(null);
          }}
          onOpenChange={(open) => {
            if (!open) setConfirm(null);
          }}
        />
      </div>
    </PermissionGate>
  );
}
