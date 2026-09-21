'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { apiGet, apiPost } from '@/lib/api/client';
import { useAuth } from '@/components/providers/AuthProvider';
import { PageHeader } from '@/components/admin/PageHeader';
import { PermissionGate } from '@/components/admin/PermissionGate';
import { AdminDataTable, type AdminColumn } from '@/components/admin/AdminDataTable';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { publicErrorMessage } from '@/lib/admin/http-error';
import {
  PASTORAL_VISIT_LOCATIONS,
  PASTORAL_VISIT_STATUSES,
} from '@/lib/pastoral/status';

interface VisitRow {
  id: string;
  memberId: string;
  caseId: string | null;
  scheduledAt: string;
  status: string;
  statusLabel: string;
  locationType: string;
  locationLabel: string;
  locationNote: string | null;
  assignedTo: { id: string; name: string | null } | null;
  member: { id: string; name: string; membershipNumber: string | null } | null;
}

export function PastoralVisitsPanel() {
  const { can, user } = useAuth();
  const [rows, setRows] = useState<VisitRow[]>([]);
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [memberQuery, setMemberQuery] = useState('');
  const [memberHits, setMemberHits] = useState<
    Array<{ id: string; displayName: string; membershipNumber: string | null }>
  >([]);
  const [form, setForm] = useState({
    memberId: '',
    memberLabel: '',
    caseId: '',
    scheduledAt: '',
    locationType: 'church',
    locationNote: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const params = useMemo(() => {
    const next: Record<string, string> = {
      page: String(page),
      pageSize: '20',
      sort: 'scheduledAt',
      dir: 'desc',
    };
    if (status !== 'all') next.status = status;
    return next;
  }, [page, status]);

  function load() {
    setLoading(true);
    void apiGet<VisitRow[]>('/admin/pastoral/visits', params).then((result) => {
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

  async function createVisit() {
    if (!form.memberId || !form.scheduledAt) {
      toast.error('Member and schedule time are required.');
      return;
    }
    setSaving(true);
    const result = await apiPost<VisitRow>('/admin/pastoral/visits', {
      memberId: form.memberId,
      caseId: form.caseId.trim() || null,
      assignedToId: user?.id || null,
      scheduledAt: new Date(form.scheduledAt).toISOString(),
      locationType: form.locationType,
      locationNote: form.locationNote.trim() || null,
      notes: form.notes.trim() || null,
    });
    setSaving(false);
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    toast.success('Saved');
    setCreateOpen(false);
    setForm({
      memberId: '',
      memberLabel: '',
      caseId: '',
      scheduledAt: '',
      locationType: 'church',
      locationNote: '',
      notes: '',
    });
    load();
  }

  const columns: AdminColumn<VisitRow>[] = [
    {
      key: 'member',
      header: 'Member',
      render: (row) => row.member?.name || '—',
    },
    {
      key: 'scheduledAt',
      header: 'When',
      render: (row) => new Date(row.scheduledAt).toLocaleString(),
    },
    {
      key: 'locationType',
      header: 'Location',
      hideOnMobile: true,
      render: (row) => row.locationLabel,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge variant="secondary">{row.statusLabel}</Badge>,
    },
    {
      key: 'assignedTo',
      header: 'Assigned',
      hideOnMobile: true,
      render: (row) => row.assignedTo?.name || '—',
    },
    {
      key: 'caseId',
      header: 'Case',
      hideOnMobile: true,
      render: (row) =>
        row.caseId ? (
          <Link className="underline" href={`/admin/pastoral-care/cases/${row.caseId}`}>
            Open
          </Link>
        ) : (
          '—'
        ),
    },
  ];

  return (
    <PermissionGate permission="pastoral.view">
      <div className="space-y-6">
        <PageHeader
          title="Pastoral visits"
          description="Schedule and track pastoral visits. Visit notes stay on this list only for staff with access."
          actions={
            can('pastoral.create') || can('pastoral.update') ? (
              <Button type="button" onClick={() => setCreateOpen(true)}>
                Schedule visit
              </Button>
            ) : null
          }
        />
        <AdminDataTable
          columns={columns}
          rows={rows}
          getRowId={(row) => row.id}
          loading={loading}
          error={error}
          emptyTitle="No visits scheduled."
          emptyDescription="Schedule a visit to begin pastoral visit tracking."
          filters={
            <Select
              value={status}
              onValueChange={(value) => {
                setPage(1);
                setStatus(value);
              }}
            >
              <SelectTrigger className="w-full sm:w-40" aria-label="Filter by status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {PASTORAL_VISIT_STATUSES.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
          page={page}
          pageSize={20}
          totalItems={total}
          onPageChange={setPage}
        />

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Schedule visit</DialogTitle>
              <DialogDescription>Assigns the visit to you by default.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Member</Label>
                {form.memberId ? (
                  <div className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
                    <span>{form.memberLabel}</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setForm((current) => ({ ...current, memberId: '', memberLabel: '' }))
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
                      placeholder="Search members"
                    />
                    {memberHits.length > 0 ? (
                      <ul className="max-h-40 space-y-1 overflow-y-auto rounded-md border p-2 text-sm">
                        {memberHits.map((member) => (
                          <li key={member.id}>
                            <button
                              type="button"
                              className="w-full rounded px-2 py-1 text-left hover:bg-muted"
                              onClick={() => {
                                setForm((current) => ({
                                  ...current,
                                  memberId: member.id,
                                  memberLabel: member.displayName,
                                }));
                                setMemberHits([]);
                                setMemberQuery('');
                              }}
                            >
                              {member.displayName}
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="visit-when">Scheduled at</Label>
                <Input
                  id="visit-when"
                  type="datetime-local"
                  value={form.scheduledAt}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, scheduledAt: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Select
                  value={form.locationType}
                  onValueChange={(value) =>
                    setForm((current) => ({ ...current, locationType: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PASTORAL_VISIT_LOCATIONS.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item.replace(/_/g, ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="visit-case">Case id (optional)</Label>
                <Input
                  id="visit-case"
                  value={form.caseId}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, caseId: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="visit-location-note">Location note</Label>
                <Input
                  id="visit-location-note"
                  value={form.locationNote}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, locationNote: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="visit-notes">Staff notes</Label>
                <Textarea
                  id="visit-notes"
                  value={form.notes}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, notes: event.target.value }))
                  }
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={() => void createVisit()} disabled={saving}>
                Schedule
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PermissionGate>
  );
}
