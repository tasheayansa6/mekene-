'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { apiGet, apiPost, apiPatch } from '@/lib/api/client';
import { useAuth } from '@/components/providers/AuthProvider';
import { PageHeader } from '@/components/admin/PageHeader';
import { PermissionGate } from '@/components/admin/PermissionGate';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { ApiErrorAlert } from '@/components/admin/ApiErrorAlert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
import Link from 'next/link';

interface SessionDetail {
  id: string;
  title: string;
  status: string;
  statusLabel: string;
  sessionTypeLabel: string;
  startsAt: string;
  endsAt: string | null;
  presentCount: number;
  recordCount: number;
  allowSelfCheckIn: boolean;
  allowQrCheckIn: boolean;
  locationNote: string | null;
  notes: string | null;
  records: Array<{
    id: string;
    statusLabel: string;
    methodLabel: string;
    checkInAt: string | null;
    member: { id: string; name: string; membershipNumber: string | null };
  }>;
}

interface Options {
  sessionTypes: Array<{ value: string; label: string }>;
  ministries: Array<{ id: string; name: string }>;
  events: Array<{ id: string; title: string }>;
  locations: Array<{ id: string; name: string }>;
}

export function SessionForm({ id }: { id?: string }) {
  const router = useRouter();
  const { can } = useAuth();
  const isCreate = !id;
  const [options, setOptions] = useState<Options | null>(null);
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [sessionType, setSessionType] = useState('sunday_service');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [ministryId, setMinistryId] = useState('none');
  const [eventId, setEventId] = useState('none');
  const [locationId, setLocationId] = useState('none');
  const [locationNote, setLocationNote] = useState('');
  const [notes, setNotes] = useState('');
  const [memberQuery, setMemberQuery] = useState('');
  const [memberResults, setMemberResults] = useState<
    Array<{ id: string; displayName: string; membershipNumber: string | null }>
  >([]);
  const [confirm, setConfirm] = useState<'open' | 'close' | 'archive' | null>(null);
  const [qrToken, setQrToken] = useState<string | null>(null);

  function loadDetail() {
    if (!id) return;
    void apiGet<{ session: SessionDetail }>(`/admin/attendance/sessions/${id}`).then((result) => {
      if (!result.success || !result.data?.session) {
        setError(result.message);
        return;
      }
      const row = result.data.session;
      setDetail(row);
      setTitle(row.title);
      setLocationNote(row.locationNote || '');
      setNotes(row.notes || '');
    });
  }

  useEffect(() => {
    void apiGet<Options>('/admin/attendance/options').then((result) => {
      setOptions(result.data || null);
    });
    if (id) loadDetail();
  }, [id]);

  async function saveCreate() {
    const result = await apiPost<{ session: { id: string } }>('/admin/attendance/sessions', {
      title,
      sessionType,
      startsAt,
      endsAt: endsAt || null,
      ministryId: ministryId === 'none' ? null : ministryId,
      eventId: eventId === 'none' ? null : eventId,
      locationId: locationId === 'none' ? null : locationId,
      locationNote: locationNote || null,
      notes: notes || null,
      status: 'scheduled',
    });
    if (!result.success || !result.data?.session) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    toast.success('Session created.');
    router.push(`/admin/attendance/sessions/${result.data.session.id}`);
  }

  async function setStatus(status: 'open' | 'closed' | 'archived') {
    if (!id) return;
    const result = await apiPatch(`/admin/attendance/sessions/${id}`, { status });
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    toast.success(result.message || 'Session updated.');
    loadDetail();
  }

  async function generateQr() {
    if (!id) return;
    const result = await apiPost<{ token: string; expiresAt: string }>(
      `/admin/attendance/sessions/${id}/qr`,
      { ttlMinutes: 90 }
    );
    if (!result.success || !result.data) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    setQrToken(result.data.token);
    toast.success('Short-lived QR token ready.');
  }

  async function searchMembers(value: string) {
    setMemberQuery(value);
    if (value.trim().length < 2) {
      setMemberResults([]);
      return;
    }
    const result = await apiGet<
      Array<{ id: string; displayName: string; membershipNumber: string | null }>
    >('/admin/members', { q: value.trim(), pageSize: '8', status: 'active' });
    setMemberResults(result.data || []);
  }

  async function addMember(memberId: string) {
    if (!id) return;
    const result = await apiPost('/admin/attendance/records', {
      sessionId: id,
      memberId,
      method: 'admin',
      status: 'present',
    });
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    toast.success('Attendance recorded.');
    setMemberQuery('');
    setMemberResults([]);
    loadDetail();
  }

  if (error) return <ApiErrorAlert message={error} />;
  if (!isCreate && !detail) return <Skeleton className="h-72 w-full" />;

  return (
    <PermissionGate permission={isCreate ? 'attendance.create' : 'attendance.view'}>
      <div className="space-y-6">
        <PageHeader
          title={isCreate ? 'Create attendance session' : detail?.title || 'Session'}
          description={
            isCreate
              ? 'Link an optional event or ministry. Opening the session enables check-in.'
              : `${detail?.sessionTypeLabel} · ${detail?.statusLabel}`
          }
          actions={
            !isCreate && detail ? (
              <div className="flex flex-wrap gap-2">
                {can('attendance.update') && detail.status !== 'open' ? (
                  <Button onClick={() => setConfirm('open')}>Open</Button>
                ) : null}
                {can('attendance.update') && detail.status === 'open' ? (
                  <Button variant="outline" onClick={() => setConfirm('close')}>
                    Close
                  </Button>
                ) : null}
                {can('attendance.assign') && detail.status === 'open' ? (
                  <Button variant="outline" onClick={() => void generateQr()}>
                    Generate QR
                  </Button>
                ) : null}
                {can('attendance.archive') ? (
                  <Button variant="ghost" onClick={() => setConfirm('archive')}>
                    Archive
                  </Button>
                ) : null}
                {can('attendance.manage') ? (
                  <Button asChild variant="outline">
                    <a href={`/api/v1/admin/attendance/export?sessionId=${detail.id}`}>
                      Export CSV
                    </a>
                  </Button>
                ) : null}
              </div>
            ) : undefined
          }
        />

        {isCreate ? (
          <Card>
            <CardHeader>
              <CardTitle>Session details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={sessionType} onValueChange={setSessionType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(options?.sessionTypes || []).map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="starts">Starts</Label>
                  <Input
                    id="starts"
                    type="datetime-local"
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ends">Ends</Label>
                  <Input
                    id="ends"
                    type="datetime-local"
                    value={endsAt}
                    onChange={(e) => setEndsAt(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Ministry</Label>
                  <Select value={ministryId} onValueChange={setMinistryId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {(options?.ministries || []).map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Event</Label>
                  <Select value={eventId} onValueChange={setEventId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {(options?.events || []).map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Select value={locationId} onValueChange={setLocationId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {(options?.locations || []).map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="location-note">Location note</Label>
                <Input
                  id="location-note"
                  value={locationNote}
                  onChange={(e) => setLocationNote(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Internal notes</Label>
                <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
              <Button onClick={() => void saveCreate()} disabled={!title.trim() || !startsAt}>
                Create session
              </Button>
            </CardContent>
          </Card>
        ) : detail ? (
          <>
            <div className="flex flex-wrap gap-2">
              <Badge>{detail.statusLabel}</Badge>
              <Badge variant="outline">{detail.presentCount} present/late</Badge>
              <Badge variant="outline">{detail.recordCount} records</Badge>
            </div>

            {qrToken ? (
              <Card>
                <CardHeader>
                  <CardTitle>Session QR token</CardTitle>
                  <CardDescription>
                    Short-lived and session-specific. It does not contain member IDs or account
                    credentials. Members check in while authenticated.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <code className="break-all text-xs">{qrToken}</code>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Staff scanner URL:{' '}
                    <Link className="underline" href="/admin/attendance/check-in">
                      /admin/attendance/check-in
                    </Link>
                  </p>
                </CardContent>
              </Card>
            ) : null}

            {can('attendance.create') ? (
              <Card>
                <CardHeader>
                  <CardTitle>Manual attendance</CardTitle>
                  <CardDescription>Search by name or membership number.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Input
                    value={memberQuery}
                    onChange={(e) => void searchMembers(e.target.value)}
                    placeholder="Search members"
                    aria-label="Search members"
                  />
                  <ul className="space-y-2 text-sm">
                    {memberResults.map((member) => (
                      <li key={member.id} className="flex items-center justify-between gap-2">
                        <span>
                          {member.displayName}
                          {member.membershipNumber ? ` · ${member.membershipNumber}` : ''}
                        </span>
                        <Button size="sm" onClick={() => void addMember(member.id)}>
                          Mark present
                        </Button>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ) : null}

            <Card>
              <CardHeader>
                <CardTitle>Attendance list</CardTitle>
              </CardHeader>
              <CardContent>
                {detail.records.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No attendance recorded yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[36rem] text-left text-sm">
                      <caption className="sr-only">Session attendance records</caption>
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="p-2 font-medium">Member</th>
                          <th className="p-2 font-medium">Status</th>
                          <th className="p-2 font-medium">Method</th>
                          <th className="p-2 font-medium">Check-in</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.records.map((row) => (
                          <tr key={row.id} className="border-t">
                            <td className="p-2">
                              <Link
                                className="hover:underline"
                                href={`/admin/attendance/members/${row.member.id}`}
                              >
                                {row.member.name}
                              </Link>
                              {row.member.membershipNumber ? (
                                <span className="text-xs text-muted-foreground">
                                  {' '}
                                  · {row.member.membershipNumber}
                                </span>
                              ) : null}
                            </td>
                            <td className="p-2">{row.statusLabel}</td>
                            <td className="p-2">{row.methodLabel}</td>
                            <td className="p-2">
                              {row.checkInAt
                                ? new Date(row.checkInAt).toLocaleTimeString()
                                : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : null}

        <ConfirmDialog
          open={confirm !== null}
          title={
            confirm === 'open'
              ? 'Open this session for check-in?'
              : confirm === 'close'
                ? 'Close this session?'
                : 'Archive this session?'
          }
          description={
            confirm === 'open'
              ? 'Members can check in while the session is open.'
              : confirm === 'close'
                ? 'Normal check-ins will stop. Staff can still correct records.'
                : 'Archived sessions stay in history and are not deleted.'
          }
          onConfirm={() => {
            if (confirm) void setStatus(confirm === 'archive' ? 'archived' : confirm);
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
