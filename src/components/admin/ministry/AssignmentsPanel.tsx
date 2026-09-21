'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { apiGet, apiPost, apiPatch } from '@/lib/api/client';
import { useAuth } from '@/components/providers/AuthProvider';
import { PageHeader } from '@/components/admin/PageHeader';
import { PermissionGate } from '@/components/admin/PermissionGate';
import { AdminDataTable, type AdminColumn } from '@/components/admin/AdminDataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { publicErrorMessage } from '@/lib/admin/http-error';

interface AssignmentRow {
  id: string;
  roleName: string;
  status: string;
  statusLabel: string;
  scheduledAt: string;
  endsAt: string | null;
  hasConflictWarning?: boolean;
  member: { id: string; name: string; membershipNumber: string | null } | null;
  event: { id: string; title: string } | null;
  ministry: { id: string; name: string } | null;
  team: { id: string; name: string } | null;
}

const ASSIGNMENT_STATUSES = [
  'proposed',
  'assigned',
  'confirmed',
  'declined',
  'completed',
  'absent',
  'replaced',
  'cancelled',
] as const;

export function AssignmentsPanel() {
  const { can } = useAuth();
  const [rows, setRows] = useState<AssignmentRow[]>([]);
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [memberQuery, setMemberQuery] = useState('');
  const [memberHits, setMemberHits] = useState<
    Array<{ id: string; displayName: string; membershipNumber: string | null }>
  >([]);
  const [form, setForm] = useState({
    memberId: '',
    memberLabel: '',
    eventId: '',
    roleName: '',
    scheduledAt: '',
    endsAt: '',
    ministryId: '',
    teamId: '',
  });

  const params = useMemo(() => {
    const next: Record<string, string> = {
      page: String(page),
      pageSize: '20',
      sort: 'scheduledAt',
      dir: 'asc',
    };
    if (status !== 'all') next.status = status;
    return next;
  }, [page, status]);

  function load() {
    setLoading(true);
    void apiGet<AssignmentRow[]>('/admin/ministry/assignments', params).then((result) => {
      setRows(result.data || []);
      setTotal(result.pagination?.totalItems || 0);
      setError(result.success ? null : result.message);
      setLoading(false);
    });
  }

  useEffect(() => {
    const handle = setTimeout(load, 150);
    return () => clearTimeout(handle);
  }, [params]);

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

  async function createAssignment() {
    if (!form.memberId || !form.eventId || !form.roleName.trim() || !form.scheduledAt) {
      toast.error('Member, event, role, and schedule are required.');
      return;
    }
    setSaving(true);
    const result = await apiPost<AssignmentRow>('/admin/ministry/assignments', {
      memberId: form.memberId,
      eventId: form.eventId.trim(),
      roleName: form.roleName.trim(),
      scheduledAt: new Date(form.scheduledAt).toISOString(),
      endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
      ministryId: form.ministryId.trim() || null,
      teamId: form.teamId.trim() || null,
    });
    setSaving(false);
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    toast.success('Saved');
    if (
      result.data?.hasConflictWarning ||
      (Array.isArray((result.data as { conflicts?: unknown[] } | null)?.conflicts) &&
        ((result.data as { conflicts: unknown[] }).conflicts?.length || 0) > 0)
    ) {
      toast.message('Schedule overlap detected for this volunteer.');
    }
    setForm({
      memberId: '',
      memberLabel: '',
      eventId: '',
      roleName: '',
      scheduledAt: '',
      endsAt: '',
      ministryId: '',
      teamId: '',
    });
    load();
  }

  async function updateStatus(id: string, nextStatus: string) {
    const result = await apiPatch(`/admin/ministry/assignments/${id}`, { status: nextStatus });
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    toast.success('Updated');
    load();
  }

  const columns: AdminColumn<AssignmentRow>[] = [
    {
      key: 'member',
      header: 'Volunteer',
      render: (row) => row.member?.name || '—',
    },
    {
      key: 'roleName',
      header: 'Role',
      render: (row) => row.roleName,
    },
    {
      key: 'event',
      header: 'Event',
      hideOnMobile: true,
      render: (row) => row.event?.title || '—',
    },
    {
      key: 'scheduledAt',
      header: 'When',
      render: (row) => new Date(row.scheduledAt).toLocaleString(),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <div className="flex flex-wrap items-center gap-1">
          <Badge variant="secondary">{row.statusLabel}</Badge>
          {row.hasConflictWarning ? <Badge variant="destructive">Overlap</Badge> : null}
        </div>
      ),
    },
  ];

  return (
    <PermissionGate permission="ministries.view">
      <div className="space-y-6">
        <PageHeader
          title="Service assignments"
          description="Assign volunteers to events. Overlaps are checked on the server."
        />

        {can('ministries.assign') ? (
          <Card>
            <CardHeader>
              <CardTitle>Create assignment</CardTitle>
              <CardDescription>
                Provide the event id and schedule window for the volunteer role.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Member</Label>
                {form.memberId ? (
                  <div className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
                    <span>{form.memberLabel}</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setForm((prev) => ({ ...prev, memberId: '', memberLabel: '' }))
                      }
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
                      <div className="max-h-36 overflow-y-auto rounded-md border">
                        {memberHits.map((hit) => (
                          <button
                            key={hit.id}
                            type="button"
                            className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                            onClick={() => {
                              setForm((prev) => ({
                                ...prev,
                                memberId: hit.id,
                                memberLabel: hit.displayName,
                              }));
                              setMemberHits([]);
                              setMemberQuery('');
                            }}
                          >
                            {hit.displayName}
                            {hit.membershipNumber ? ` · ${hit.membershipNumber}` : ''}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="assignment-event">Event ID</Label>
                <Input
                  id="assignment-event"
                  value={form.eventId}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, eventId: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="assignment-role">Role</Label>
                <Input
                  id="assignment-role"
                  value={form.roleName}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, roleName: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="assignment-start">Starts</Label>
                <Input
                  id="assignment-start"
                  type="datetime-local"
                  value={form.scheduledAt}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, scheduledAt: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="assignment-end">Ends</Label>
                <Input
                  id="assignment-end"
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={(event) => setForm((prev) => ({ ...prev, endsAt: event.target.value }))}
                />
              </div>
              <div className="sm:col-span-2">
                <Button type="button" disabled={saving} onClick={() => void createAssignment()}>
                  {saving ? 'Saving…' : 'Save assignment'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <AdminDataTable
          columns={columns}
          rows={rows}
          getRowId={(row) => row.id}
          loading={loading}
          error={error}
          emptyTitle="No service assignments yet."
          page={page}
          pageSize={20}
          totalItems={total}
          onPageChange={setPage}
          filters={
            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-44" aria-label="Filter by status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {ASSIGNMENT_STATUSES.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
          rowActions={
            can('ministries.assign')
              ? (row) => (
                  <Select
                    value={row.status}
                    onValueChange={(value) => void updateStatus(row.id, value)}
                  >
                    <SelectTrigger className="h-8 w-36" aria-label="Change status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ASSIGNMENT_STATUSES.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item.replace(/_/g, ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )
              : undefined
          }
        />
      </div>
    </PermissionGate>
  );
}
