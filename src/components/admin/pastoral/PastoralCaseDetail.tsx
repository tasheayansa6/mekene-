'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { apiGet, apiPatch, apiPost } from '@/lib/api/client';
import { useAuth } from '@/components/providers/AuthProvider';
import { PageHeader } from '@/components/admin/PageHeader';
import { PermissionGate } from '@/components/admin/PermissionGate';
import { ApiErrorAlert } from '@/components/admin/ApiErrorAlert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { publicErrorMessage } from '@/lib/admin/http-error';
import {
  PASTORAL_CASE_STATUSES,
  PASTORAL_FOLLOWUP_STATUSES,
  PASTORAL_NOTE_VISIBILITIES,
} from '@/lib/pastoral/status';

interface CaseDetail {
  id: string;
  title: string;
  summary: string | null;
  status: string;
  statusLabel: string;
  priority: string;
  priorityLabel: string;
  assignedToId: string | null;
  memberId: string;
  openedAt: string | null;
  closedAt: string | null;
  updatedAt: string;
  category: { id: string; name: string } | null;
  member: { id: string; name: string; membershipNumber: string | null } | null;
  assignedTo: { id: string; name: string | null } | null;
  createdBy: { id: string; name: string | null } | null;
  counts?: { notes: number; visits: number; followUps: number };
}

interface NoteRow {
  id: string;
  content: string;
  visibilityLabel: string;
  createdAt: string;
  author: { id: string; name: string | null } | null;
}

interface FollowUpRow {
  id: string;
  task: string;
  dueDate: string | null;
  status: string;
  statusLabel: string;
  assignedTo: { id: string; name: string | null } | null;
}

export function PastoralCaseDetail({ id }: { id: string }) {
  const { can, user } = useAuth();
  const canNotes = can('pastoral.moderate') || can('pastoral.manage');
  const [row, setRow] = useState<CaseDetail | null>(null);
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [followUps, setFollowUps] = useState<FollowUpRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('open');
  const [assigneeId, setAssigneeId] = useState('');
  const [noteBody, setNoteBody] = useState('');
  const [noteVisibility, setNoteVisibility] = useState('case_team');
  const [followUpTask, setFollowUpTask] = useState('');
  const [followUpDue, setFollowUpDue] = useState('');

  function load() {
    void Promise.all([
      apiGet<CaseDetail>(`/admin/pastoral/cases/${id}`),
      apiGet<FollowUpRow[]>('/admin/pastoral/followups', { caseId: id, pageSize: '50' }),
      canNotes ? apiGet<NoteRow[]>(`/admin/pastoral/cases/${id}/notes`) : Promise.resolve(null),
    ]).then(([detail, followUpResult, notesResult]) => {
      if (!detail.success || !detail.data) {
        setError(detail.message);
        setLoading(false);
        return;
      }
      setRow(detail.data);
      setStatus(detail.data.status);
      setAssigneeId(detail.data.assignedToId || '');
      setFollowUps(followUpResult.data || []);
      if (notesResult?.success) setNotes(notesResult.data || []);
      setLoading(false);
    });
  }

  useEffect(() => {
    load();
  }, [id, canNotes]);

  async function saveStatus() {
    const result = await apiPatch<CaseDetail>(`/admin/pastoral/cases/${id}`, { status });
    if (!result.success || !result.data) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    setRow(result.data);
    toast.success('Updated');
  }

  async function saveAssignee() {
    const result = await apiPatch<CaseDetail>(`/admin/pastoral/cases/${id}`, {
      assignedToId: assigneeId.trim() || null,
    });
    if (!result.success || !result.data) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    setRow(result.data);
    setAssigneeId(result.data.assignedToId || '');
    toast.success('Updated');
  }

  async function addNote() {
    if (noteBody.trim().length < 3) return;
    const result = await apiPost<NoteRow>(`/admin/pastoral/cases/${id}/notes`, {
      content: noteBody.trim(),
      visibility: noteVisibility,
    });
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    setNoteBody('');
    toast.success('Saved');
    load();
  }

  async function addFollowUp() {
    if (followUpTask.trim().length < 3 || !row) return;
    const result = await apiPost<FollowUpRow>('/admin/pastoral/followups', {
      caseId: id,
      memberId: row.memberId,
      task: followUpTask.trim(),
      dueDate: followUpDue || null,
      assignedToId: row.assignedToId,
    });
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    setFollowUpTask('');
    setFollowUpDue('');
    toast.success('Saved');
    load();
  }

  async function completeFollowUp(followUpId: string) {
    const result = await apiPatch(`/admin/pastoral/followups/${followUpId}`, {
      status: 'completed',
      completedAt: new Date().toISOString(),
    });
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    toast.success('Updated');
    load();
  }

  if (loading) return <Skeleton className="h-96 w-full" />;

  return (
    <PermissionGate permission="pastoral.view">
      <div className="space-y-6">
        <PageHeader
          title={row?.title || 'Pastoral case'}
          description="Confidential pastoral care. Note content is never used in page titles."
          actions={
            <Button asChild variant="outline">
              <Link href="/admin/pastoral-care/cases">Back to cases</Link>
            </Button>
          }
        />
        {error || !row ? <ApiErrorAlert message={error || 'Case not found.'} /> : null}
        {row ? (
          <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex flex-wrap gap-2">
                    <Badge>{row.statusLabel}</Badge>
                    <Badge variant="outline">{row.priorityLabel}</Badge>
                    {row.category ? <Badge variant="secondary">{row.category.name}</Badge> : null}
                  </div>
                  <CardTitle className="pt-2">{row.title}</CardTitle>
                  <CardDescription>
                    {row.member?.name || 'Member'}
                    {row.member?.membershipNumber ? ` · ${row.member.membershipNumber}` : ''}
                    {row.member ? (
                      <>
                        {' · '}
                        <Link className="underline" href={`/admin/members/${row.member.id}`}>
                          Member profile
                        </Link>
                      </>
                    ) : null}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {row.summary ? (
                    <p className="whitespace-pre-wrap leading-relaxed">{row.summary}</p>
                  ) : (
                    <p className="text-muted-foreground">No summary recorded.</p>
                  )}
                  <p className="text-muted-foreground">
                    Opened {row.openedAt ? new Date(row.openedAt).toLocaleString() : '—'} · Updated{' '}
                    {new Date(row.updatedAt).toLocaleString()}
                  </p>
                  <p className="text-muted-foreground">
                    Created by {row.createdBy?.name || '—'} · Assigned to{' '}
                    {row.assignedTo?.name || 'Unassigned'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                  <CardDescription>Pastoral notes are restricted.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!canNotes ? (
                    <p className="text-sm text-muted-foreground">
                      Notes require pastoral note permission
                    </p>
                  ) : (
                    <>
                      <ul className="space-y-3">
                        {notes.length === 0 ? (
                          <li className="text-sm text-muted-foreground">No notes yet.</li>
                        ) : (
                          notes.map((note) => (
                            <li key={note.id} className="rounded-md border p-3 text-sm">
                              <p className="whitespace-pre-wrap">{note.content}</p>
                              <p className="mt-2 text-xs text-muted-foreground">
                                {note.author?.name || 'Staff'} · {note.visibilityLabel} ·{' '}
                                {new Date(note.createdAt).toLocaleString()}
                              </p>
                            </li>
                          ))
                        )}
                      </ul>
                      <div className="space-y-2">
                        <Label htmlFor="pastoral-note">Add note</Label>
                        <Textarea
                          id="pastoral-note"
                          value={noteBody}
                          onChange={(event) => setNoteBody(event.target.value)}
                          rows={4}
                        />
                        <Select value={noteVisibility} onValueChange={setNoteVisibility}>
                          <SelectTrigger aria-label="Note visibility">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PASTORAL_NOTE_VISIBILITIES.map((item) => (
                              <SelectItem key={item} value={item}>
                                {item.replace(/_/g, ' ')}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button type="button" onClick={() => void addNote()}>
                          Add note
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Follow-ups</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2 text-sm">
                    {followUps.length === 0 ? (
                      <li className="text-muted-foreground">No follow-ups yet.</li>
                    ) : (
                      followUps.map((item) => (
                        <li
                          key={item.id}
                          className="flex flex-col gap-2 border-b py-2 last:border-0 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div>
                            <p>{item.task}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.statusLabel}
                              {item.dueDate
                                ? ` · due ${new Date(item.dueDate).toLocaleDateString()}`
                                : ''}
                              {item.assignedTo?.name ? ` · ${item.assignedTo.name}` : ''}
                            </p>
                          </div>
                          {can('pastoral.update') &&
                          PASTORAL_FOLLOWUP_STATUSES.includes(
                            item.status as (typeof PASTORAL_FOLLOWUP_STATUSES)[number]
                          ) &&
                          item.status !== 'completed' &&
                          item.status !== 'cancelled' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => void completeFollowUp(item.id)}
                            >
                              Complete
                            </Button>
                          ) : null}
                        </li>
                      ))
                    )}
                  </ul>
                  {can('pastoral.create') || can('pastoral.update') ? (
                    <div className="space-y-2">
                      <Label htmlFor="followup-task">New follow-up</Label>
                      <Input
                        id="followup-task"
                        value={followUpTask}
                        onChange={(event) => setFollowUpTask(event.target.value)}
                        placeholder="Task"
                      />
                      <Input
                        type="date"
                        value={followUpDue}
                        onChange={(event) => setFollowUpDue(event.target.value)}
                        aria-label="Due date"
                      />
                      <Button type="button" onClick={() => void addFollowUp()}>
                        Add follow-up
                      </Button>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </div>

            <aside className="space-y-4">
              {can('pastoral.update') ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Status</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger aria-label="Case status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PASTORAL_CASE_STATUSES.map((item) => (
                          <SelectItem key={item} value={item}>
                            {item.replace(/_/g, ' ')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="button" className="w-full" onClick={() => void saveStatus()}>
                      Update status
                    </Button>
                  </CardContent>
                </Card>
              ) : null}

              {can('pastoral.assign') || can('pastoral.manage') ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Assignment</CardTitle>
                    <CardDescription>Set the assignee user id.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Input
                      value={assigneeId}
                      onChange={(event) => setAssigneeId(event.target.value)}
                      placeholder="User id"
                      aria-label="Assignee user id"
                    />
                    <div className="flex flex-wrap gap-2">
                      {user?.id ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setAssigneeId(user.id)}
                        >
                          Assign to me
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setAssigneeId('')}
                      >
                        Unassign
                      </Button>
                    </div>
                    <Button type="button" className="w-full" onClick={() => void saveAssignee()}>
                      Save assignment
                    </Button>
                  </CardContent>
                </Card>
              ) : null}

              <Card>
                <CardHeader>
                  <CardTitle>Activity counts</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <p>Notes: {row.counts?.notes ?? '—'}</p>
                  <p>Visits: {row.counts?.visits ?? '—'}</p>
                  <p>Follow-ups: {row.counts?.followUps ?? '—'}</p>
                </CardContent>
              </Card>
            </aside>
          </div>
        ) : null}
      </div>
    </PermissionGate>
  );
}
