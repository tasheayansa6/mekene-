'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { apiGet, apiPost } from '@/lib/api/client';
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

interface ProgramRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  ministry: { id: string; name: string } | null;
}

interface SessionRow {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  location: string | null;
  capacity: number | null;
  status: string;
  enrolledCount?: number;
  program: { id: string; name: string } | null;
}

interface MinistryOption {
  id: string;
  name: string;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function TrainingPanel() {
  const { can } = useAuth();
  const [programs, setPrograms] = useState<ProgramRow[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [ministries, setMinistries] = useState<MinistryOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingProgram, setSavingProgram] = useState(false);
  const [savingSession, setSavingSession] = useState(false);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [memberQuery, setMemberQuery] = useState('');
  const [memberHits, setMemberHits] = useState<
    Array<{ id: string; displayName: string; membershipNumber: string | null }>
  >([]);
  const [enrollMemberId, setEnrollMemberId] = useState('');
  const [enrollMemberLabel, setEnrollMemberLabel] = useState('');
  const [programForm, setProgramForm] = useState({
    name: '',
    slug: '',
    description: '',
    ministryId: 'none',
  });
  const [sessionForm, setSessionForm] = useState({
    programId: '',
    title: '',
    startsAt: '',
    endsAt: '',
    location: '',
    capacity: '',
  });

  function load() {
    setLoading(true);
    void Promise.all([
      apiGet<ProgramRow[]>('/admin/ministry/training/programs'),
      apiGet<SessionRow[]>('/admin/ministry/training/sessions'),
    ]).then(([programsResult, sessionsResult]) => {
      setPrograms(programsResult.data || []);
      setSessions(sessionsResult.data || []);
      setError(
        !programsResult.success
          ? programsResult.message
          : !sessionsResult.success
            ? sessionsResult.message
            : null
      );
      setLoading(false);
    });
  }

  useEffect(() => {
    load();
    void apiGet<MinistryOption[]>('/admin/ministries', { pageSize: '100' }).then((result) => {
      setMinistries(result.data || []);
    });
  }, []);

  async function searchMembers(value: string) {
    setMemberQuery(value);
    if (value.trim().length < 2) {
      setMemberHits([]);
      return;
    }
    const result = await apiGet<
      Array<{ id: string; displayName: string; membershipNumber: string | null }>
    >('/admin/members', { q: value.trim(), pageSize: '8', status: 'active' });
    setMemberHits(result.data || []);
  }

  async function createProgram() {
    if (programForm.name.trim().length < 2) {
      toast.error('Program name is required.');
      return;
    }
    setSavingProgram(true);
    const result = await apiPost('/admin/ministry/training/programs', {
      name: programForm.name.trim(),
      slug: programForm.slug.trim() || slugify(programForm.name),
      description: programForm.description.trim() || null,
      ministryId: programForm.ministryId === 'none' ? null : programForm.ministryId,
    });
    setSavingProgram(false);
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    toast.success('Saved');
    setProgramForm({ name: '', slug: '', description: '', ministryId: 'none' });
    load();
  }

  async function createSession() {
    if (!sessionForm.programId || !sessionForm.title.trim() || !sessionForm.startsAt) {
      toast.error('Program, title, and start time are required.');
      return;
    }
    setSavingSession(true);
    const result = await apiPost('/admin/ministry/training/sessions', {
      programId: sessionForm.programId,
      title: sessionForm.title.trim(),
      startsAt: new Date(sessionForm.startsAt).toISOString(),
      endsAt: sessionForm.endsAt ? new Date(sessionForm.endsAt).toISOString() : null,
      location: sessionForm.location.trim() || null,
      capacity: sessionForm.capacity ? Number(sessionForm.capacity) : null,
    });
    setSavingSession(false);
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    toast.success('Saved');
    setSessionForm({
      programId: '',
      title: '',
      startsAt: '',
      endsAt: '',
      location: '',
      capacity: '',
    });
    load();
  }

  async function enroll(sessionId: string) {
    if (!enrollMemberId) {
      toast.error('Select a member to enroll.');
      return;
    }
    setEnrollingId(sessionId);
    const result = await apiPost(`/admin/ministry/training/sessions/${sessionId}/enroll`, {
      memberId: enrollMemberId,
    });
    setEnrollingId(null);
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    toast.success('Saved');
    load();
  }

  return (
    <PermissionGate permission="ministries.view">
      <div className="space-y-6">
        <PageHeader
          title="Training"
          description="Programs and sessions for ministry volunteers. Capacity is enforced on enroll."
        />

        {error ? <ApiErrorAlert message={error} /> : null}
        {loading ? <Skeleton className="h-48 w-full" /> : null}

        {can('ministries.assign') ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>New program</CardTitle>
                <CardDescription>Optional link to a ministry.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="program-name">Name</Label>
                  <Input
                    id="program-name"
                    value={programForm.name}
                    onChange={(event) => {
                      const name = event.target.value;
                      setProgramForm((prev) => ({
                        ...prev,
                        name,
                        slug: prev.slug || slugify(name),
                      }));
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="program-slug">Slug</Label>
                  <Input
                    id="program-slug"
                    value={programForm.slug}
                    onChange={(event) =>
                      setProgramForm((prev) => ({ ...prev, slug: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ministry</Label>
                  <Select
                    value={programForm.ministryId}
                    onValueChange={(value) =>
                      setProgramForm((prev) => ({ ...prev, ministryId: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {ministries.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="program-description">Description</Label>
                  <Textarea
                    id="program-description"
                    value={programForm.description}
                    onChange={(event) =>
                      setProgramForm((prev) => ({ ...prev, description: event.target.value }))
                    }
                    rows={2}
                  />
                </div>
                <Button
                  type="button"
                  disabled={savingProgram}
                  onClick={() => void createProgram()}
                >
                  {savingProgram ? 'Saving…' : 'Save program'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>New session</CardTitle>
                <CardDescription>Schedule a training session under a program.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label>Program</Label>
                  <Select
                    value={sessionForm.programId || 'none'}
                    onValueChange={(value) =>
                      setSessionForm((prev) => ({
                        ...prev,
                        programId: value === 'none' ? '' : value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select program" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select program</SelectItem>
                      {programs.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="session-title">Title</Label>
                  <Input
                    id="session-title"
                    value={sessionForm.title}
                    onChange={(event) =>
                      setSessionForm((prev) => ({ ...prev, title: event.target.value }))
                    }
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="session-start">Starts</Label>
                    <Input
                      id="session-start"
                      type="datetime-local"
                      value={sessionForm.startsAt}
                      onChange={(event) =>
                        setSessionForm((prev) => ({ ...prev, startsAt: event.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="session-end">Ends</Label>
                    <Input
                      id="session-end"
                      type="datetime-local"
                      value={sessionForm.endsAt}
                      onChange={(event) =>
                        setSessionForm((prev) => ({ ...prev, endsAt: event.target.value }))
                      }
                    />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="session-location">Location</Label>
                    <Input
                      id="session-location"
                      value={sessionForm.location}
                      onChange={(event) =>
                        setSessionForm((prev) => ({ ...prev, location: event.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="session-capacity">Capacity</Label>
                    <Input
                      id="session-capacity"
                      type="number"
                      min={1}
                      value={sessionForm.capacity}
                      onChange={(event) =>
                        setSessionForm((prev) => ({ ...prev, capacity: event.target.value }))
                      }
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  disabled={savingSession}
                  onClick={() => void createSession()}
                >
                  {savingSession ? 'Saving…' : 'Save session'}
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Programs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {programs.length === 0 ? (
                <p className="text-muted-foreground">No programs yet.</p>
              ) : (
                programs.map((row) => (
                  <div key={row.id} className="flex items-center justify-between gap-2 border-b py-2 last:border-0">
                    <div>
                      <p className="font-medium">{row.name}</p>
                      <p className="text-muted-foreground">
                        {row.ministry?.name || 'General'} · {row.slug}
                      </p>
                    </div>
                    <Badge variant={row.isActive ? 'secondary' : 'outline'}>
                      {row.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sessions</CardTitle>
              <CardDescription>Select a member below, then enroll into a session.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {can('ministries.assign') && (
                <div className="space-y-2">
                  <Label>Member to enroll</Label>
                  {enrollMemberId ? (
                    <div className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
                      <span>{enrollMemberLabel}</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEnrollMemberId('');
                          setEnrollMemberLabel('');
                        }}
                      >
                        Clear
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Input
                        value={memberQuery}
                        onChange={(event) => void searchMembers(event.target.value)}
                        placeholder="Search members…"
                      />
                      {memberHits.length > 0 ? (
                        <div className="max-h-32 overflow-y-auto rounded-md border">
                          {memberHits.map((hit) => (
                            <button
                              key={hit.id}
                              type="button"
                              className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                              onClick={() => {
                                setEnrollMemberId(hit.id);
                                setEnrollMemberLabel(hit.displayName);
                                setMemberHits([]);
                                setMemberQuery('');
                              }}
                            >
                              {hit.displayName}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              )}
              <div className="space-y-2 text-sm">
                {sessions.length === 0 ? (
                  <p className="text-muted-foreground">No sessions yet.</p>
                ) : (
                  sessions.map((row) => (
                    <div
                      key={row.id}
                      className="flex flex-wrap items-center justify-between gap-2 border-b py-2 last:border-0"
                    >
                      <div>
                        <p className="font-medium">{row.title}</p>
                        <p className="text-muted-foreground">
                          {row.program?.name || 'Program'} ·{' '}
                          {new Date(row.startsAt).toLocaleString()}
                          {row.capacity != null
                            ? ` · ${row.enrolledCount ?? 0}/${row.capacity}`
                            : ''}
                        </p>
                      </div>
                      {can('ministries.assign') && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={enrollingId === row.id}
                          onClick={() => void enroll(row.id)}
                        >
                          Enroll
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PermissionGate>
  );
}
