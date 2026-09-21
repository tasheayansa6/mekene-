'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { apiGet, apiPatch, apiPost } from '@/lib/api/client';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { publicErrorMessage } from '@/lib/admin/http-error';
import { adminStatusLabel } from '@/lib/prayer/status';
import { Skeleton } from '@/components/ui/skeleton';

interface Detail {
  id: string;
  title: string;
  content: string;
  visibility: string;
  status: string;
  publicApproved: boolean;
  publiclyListed: boolean;
  categoryId: string | null;
  assignedToId: string | null;
  requesterMessage: string | null;
  prayedCount: number;
  createdAt: string;
  updatedAt: string;
  category: { id: string; name: string } | null;
  assignedTo: { id: string; name: string | null } | null;
  requester: { name: string; email: string | null; isGuest: boolean };
  notes: Array<{ id: string; body: string; createdAt: string; authorName: string | null }>;
}

interface Options {
  categories: Array<{ id: string; name: string }>;
  assignees: Array<{ id: string; name: string; role: string }>;
}

export function PrayerAdminDetail({ id }: { id: string }) {
  const { can } = useAuth();
  const [row, setRow] = useState<Detail | null>(null);
  const [options, setOptions] = useState<Options | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [requesterMessage, setRequesterMessage] = useState('');
  const [status, setStatus] = useState('new');
  const [assignee, setAssignee] = useState('none');
  const [confirm, setConfirm] = useState<'approve' | 'reject' | 'archive' | 'review' | null>(null);
  const [pending, setPending] = useState(false);

  function load() {
    void Promise.all([
      apiGet<Detail>(`/admin/prayer/${id}`),
      apiGet<Options>('/admin/prayer/options'),
    ]).then(([detail, opts]) => {
      if (!detail.success || !detail.data) {
        setError(detail.message);
        setLoading(false);
        return;
      }
      setRow(detail.data);
      setStatus(detail.data.status);
      setAssignee(detail.data.assignedToId || 'none');
      setRequesterMessage(detail.data.requesterMessage || '');
      setOptions(opts.data || null);
      setLoading(false);
    });
  }

  useEffect(() => {
    load();
  }, [id]);

  async function run(path: string, body?: unknown) {
    setPending(true);
    const result = await apiPost<Detail>(path, body ?? {});
    setPending(false);
    if (!result.success || !result.data) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    setRow(result.data);
    setStatus(result.data.status);
    setAssignee(result.data.assignedToId || 'none');
    setConfirm(null);
    toast.success(result.message || 'Updated.');
  }

  async function saveStatus() {
    const result = await apiPatch<Detail>(`/admin/prayer/${id}`, {
      status,
      requesterMessage: requesterMessage || null,
    });
    if (!result.success || !result.data) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    setRow(result.data);
    toast.success('Updated.');
  }

  async function assign() {
    const result = await apiPost<Detail>(`/admin/prayer/${id}/assign`, {
      assignedToId: assignee === 'none' ? null : assignee,
    });
    if (!result.success || !result.data) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    setRow(result.data);
    toast.success('Assignment updated.');
  }

  async function addNote() {
    const result = await apiPost<Detail>(`/admin/prayer/${id}/notes`, { body: note });
    if (!result.success || !result.data) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    setRow(result.data);
    setNote('');
    toast.success('Internal note added.');
  }

  if (loading) return <Skeleton className="h-96 w-full" />;

  return (
    <PermissionGate permission="prayer.view">
      <div className="space-y-6">
        <PageHeader
          title={row?.title || 'Prayer request'}
          description="Internal notes never appear on the public website or the member view unless you write a requester update."
          actions={
            <Button asChild variant="outline">
              <Link href="/admin/prayer">Back to list</Link>
            </Button>
          }
        />
        {error || !row ? <ApiErrorAlert message={error || 'Request not found.'} /> : null}
        {row ? (
          <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <section className="space-y-4 rounded-md border p-4">
              <div className="flex flex-wrap gap-2">
                <Badge>{adminStatusLabel(row.status)}</Badge>
                <Badge variant="outline">{row.visibility === 'public' ? 'Requested public' : 'Private'}</Badge>
                {row.publiclyListed ? <Badge variant="secondary">Shown publicly</Badge> : null}
              </div>
              <p className="whitespace-pre-wrap leading-relaxed">{row.content}</p>
              <p className="text-sm text-muted-foreground">
                Submitted {new Date(row.createdAt).toLocaleString()} · {row.prayedCount} public “I prayed” responses
              </p>
              <div className="rounded-md bg-muted/50 p-3 text-sm">
                <p>
                  <span className="font-medium">Requester:</span> {row.requester.name}
                </p>
                {row.requester.email ? (
                  <p>
                    <span className="font-medium">Contact:</span> {row.requester.email}
                  </p>
                ) : (
                  <p className="text-muted-foreground">Identity details are hidden for your role, or were not provided.</p>
                )}
              </div>
            </section>

            <aside className="space-y-4">
              {can('prayer.update') ? (
                <div className="space-y-3 rounded-md border p-4">
                  <Label htmlFor="prayer-status">Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger id="prayer-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {can('prayer.moderate') ? (
                        <>
                          <SelectItem value="new">New</SelectItem>
                          <SelectItem value="under_review">Under Review</SelectItem>
                        </>
                      ) : null}
                      <SelectItem value="assigned">Assigned</SelectItem>
                      <SelectItem value="praying">Praying</SelectItem>
                      <SelectItem value="answered">Answered</SelectItem>
                    </SelectContent>
                  </Select>
                  <Label htmlFor="requester-update">Update for the requester</Label>
                  <Textarea
                    id="requester-update"
                    value={requesterMessage}
                    onChange={(event) => setRequesterMessage(event.target.value)}
                    placeholder="Optional message the requester can see. Internal notes belong below."
                  />
                  <Button onClick={() => void saveStatus()}>Save status</Button>
                </div>
              ) : null}

              {can('prayer.assign') ? (
                <div className="space-y-3 rounded-md border p-4">
                  <Label htmlFor="assigned-to">Assigned to</Label>
                  <Select value={assignee} onValueChange={setAssignee}>
                    <SelectTrigger id="assigned-to">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {(options?.assignees || []).map((person) => (
                        <SelectItem key={person.id} value={person.id}>
                          {person.name} ({person.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={() => void assign()}>
                    Save assignment
                  </Button>
                </div>
              ) : null}

              {can('prayer.moderate') ? (
                <div className="flex flex-wrap gap-2 rounded-md border p-4">
                  <Button onClick={() => setConfirm('approve')}>Approve</Button>
                  <Button variant="outline" onClick={() => setConfirm('review')}>
                    Return for review
                  </Button>
                  <Button variant="destructive" onClick={() => setConfirm('reject')}>
                    Reject
                  </Button>
                  {can('prayer.archive') ? (
                    <Button variant="secondary" onClick={() => setConfirm('archive')}>
                      Archive
                    </Button>
                  ) : null}
                </div>
              ) : can('prayer.archive') ? (
                <Button variant="secondary" onClick={() => setConfirm('archive')}>
                  Archive
                </Button>
              ) : null}

              {can('prayer.update') ? (
                <div className="space-y-3 rounded-md border p-4">
                  <Label htmlFor="internal-note">Internal note</Label>
                  <Textarea
                    id="internal-note"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Prayer team prayed for this request during Wednesday prayer meeting."
                  />
                  <Button variant="outline" onClick={() => void addNote()} disabled={note.trim().length < 3}>
                    Add internal note
                  </Button>
                  <ul className="space-y-3 text-sm">
                    {row.notes.map((item) => (
                      <li key={item.id} className="rounded-md bg-muted/40 p-3">
                        <p>{item.body}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {item.authorName} · {new Date(item.createdAt).toLocaleString()}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </aside>
          </div>
        ) : null}

        <ConfirmDialog
          open={Boolean(confirm)}
          onOpenChange={(open) => !open && setConfirm(null)}
          title={
            confirm === 'approve'
              ? 'Approve this request?'
              : confirm === 'reject'
                ? 'Reject this request?'
                : confirm === 'archive'
                  ? 'Archive this request?'
                  : 'Return this request for review?'
          }
          description={
            confirm === 'approve'
              ? 'If the requester asked for public display, it will appear on the public prayer page only after this approval. Check that the text does not include private contact details or other information that should stay off the website.'
              : confirm === 'reject'
                ? 'The request will leave the active prayer queue and will not be shown publicly.'
                : confirm === 'archive'
                  ? 'Archived requests remain in church records. They are not permanently deleted.'
                  : 'Public display will be removed until a moderator approves the request again.'
          }
          confirmLabel="Continue"
          destructive={confirm === 'reject' || confirm === 'archive'}
          loading={pending}
          onConfirm={() => {
            if (confirm === 'approve') void run(`/admin/prayer/${id}/approve`);
            if (confirm === 'reject') void run(`/admin/prayer/${id}/reject`);
            if (confirm === 'archive') void run(`/admin/prayer/${id}/archive`);
            if (confirm === 'review') void run(`/admin/prayer/${id}/review`);
          }}
        />
      </div>
    </PermissionGate>
  );
}
