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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { publicErrorMessage } from '@/lib/admin/http-error';

interface StaffRow {
  id: string;
  staffNumber: string | null;
  status: string;
  statusLabel: string;
  workEmail: string | null;
  workPhone: string | null;
  startDate: string | null;
  user: { id: string; name: string | null } | null;
  member: { id: string; name: string; membershipNumber: string | null } | null;
  department: { id: string; name: string } | null;
  position: { id: string; name: string } | null;
  supervisor: { id: string; name: string | null } | null;
}

interface OptionRow {
  id: string;
  name: string;
  isActive?: boolean;
}

const STAFF_STATUSES = ['active', 'on_leave', 'suspended', 'inactive', 'former'] as const;

export function StaffDirectory() {
  const { can } = useAuth();
  const [rows, setRows] = useState<StaffRow[]>([]);
  const [departments, setDepartments] = useState<OptionRow[]>([]);
  const [positions, setPositions] = useState<OptionRow[]>([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [userQuery, setUserQuery] = useState('');
  const [userHits, setUserHits] = useState<
    Array<{ id: string; firstName: string; lastName: string; email: string }>
  >([]);
  const [form, setForm] = useState({
    userId: '',
    userLabel: '',
    departmentId: 'none',
    positionId: 'none',
    workEmail: '',
    workPhone: '',
    staffNumber: '',
    status: 'active',
  });

  const params = useMemo(() => {
    const next: Record<string, string> = {
      page: String(page),
      pageSize: '20',
    };
    if (q.trim()) next.q = q.trim();
    if (status !== 'all') next.status = status;
    return next;
  }, [page, q, status]);

  function load() {
    setLoading(true);
    void apiGet<StaffRow[]>('/admin/staff', params).then((result) => {
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

  useEffect(() => {
    void apiGet<OptionRow[]>('/admin/staff/departments').then((result) => {
      setDepartments((result.data || []).filter((item) => item.isActive !== false));
    });
    void apiGet<OptionRow[]>('/admin/staff/positions').then((result) => {
      setPositions((result.data || []).filter((item) => item.isActive !== false));
    });
  }, []);

  async function searchUsers(value: string) {
    setUserQuery(value);
    if (value.trim().length < 2) {
      setUserHits([]);
      return;
    }
    const result = await apiGet<
      Array<{ id: string; firstName: string; lastName: string; email: string }>
    >('/admin/users', { q: value.trim(), pageSize: '8' });
    setUserHits(result.data || []);
  }

  async function createStaff() {
    if (!form.userId) {
      toast.error('Select a user.');
      return;
    }
    setSaving(true);
    const result = await apiPost<StaffRow>('/admin/staff', {
      userId: form.userId,
      departmentId: form.departmentId === 'none' ? null : form.departmentId,
      positionId: form.positionId === 'none' ? null : form.positionId,
      workEmail: form.workEmail.trim() || null,
      workPhone: form.workPhone.trim() || null,
      staffNumber: form.staffNumber.trim() || null,
      status: form.status,
    });
    setSaving(false);
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    toast.success('Saved');
    setCreateOpen(false);
    setForm({
      userId: '',
      userLabel: '',
      departmentId: 'none',
      positionId: 'none',
      workEmail: '',
      workPhone: '',
      staffNumber: '',
      status: 'active',
    });
    load();
  }

  async function updateStatus(id: string, nextStatus: string) {
    const result = await apiPatch(`/admin/staff/${id}`, { status: nextStatus });
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    toast.success('Updated');
    load();
  }

  const columns: AdminColumn<StaffRow>[] = [
    {
      key: 'user',
      header: 'Name',
      render: (row) => row.user?.name || row.member?.name || '—',
    },
    {
      key: 'staffNumber',
      header: 'Staff #',
      hideOnMobile: true,
      render: (row) => row.staffNumber || '—',
    },
    {
      key: 'department',
      header: 'Department',
      hideOnMobile: true,
      render: (row) => row.department?.name || '—',
    },
    {
      key: 'position',
      header: 'Position',
      render: (row) => row.position?.name || '—',
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge variant="secondary">{row.statusLabel}</Badge>,
    },
    {
      key: 'workEmail',
      header: 'Work email',
      hideOnMobile: true,
      render: (row) => row.workEmail || '—',
    },
  ];

  return (
    <PermissionGate permission="staff.view">
      <div className="space-y-6">
        <PageHeader
          title="Staff directory"
          description="Church staff profiles linked to user accounts. Notes stay internal to authorized staff."
          actions={
            can('staff.create') ? (
              <Button type="button" onClick={() => setCreateOpen(true)}>
                Add staff
              </Button>
            ) : null
          }
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader>
              <CardDescription>Listed</CardDescription>
              <CardTitle>{total}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Departments</CardDescription>
              <CardTitle>{departments.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Positions</CardDescription>
              <CardTitle>{positions.length}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <AdminDataTable
          columns={columns}
          rows={rows}
          getRowId={(row) => row.id}
          loading={loading}
          error={error}
          emptyTitle="No staff profiles yet."
          emptyDescription="Add a staff profile for an existing user account."
          search={q}
          onSearchChange={(value) => {
            setQ(value);
            setPage(1);
          }}
          searchPlaceholder="Search staff…"
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
                {STAFF_STATUSES.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
          rowActions={
            can('staff.update')
              ? (row) => (
                  <Select
                    value={row.status}
                    onValueChange={(value) => void updateStatus(row.id, value)}
                  >
                    <SelectTrigger className="h-8 w-32" aria-label="Change status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STAFF_STATUSES.map((item) => (
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

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add staff profile</DialogTitle>
              <DialogDescription>
                Links a directory profile to an existing user. Does not create a new login.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>User</Label>
                {form.userId ? (
                  <div className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
                    <span>{form.userLabel}</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setForm((prev) => ({ ...prev, userId: '', userLabel: '' }))}
                    >
                      Clear
                    </Button>
                  </div>
                ) : (
                  <>
                    <Input
                      value={userQuery}
                      onChange={(event) => void searchUsers(event.target.value)}
                      placeholder="Search users…"
                    />
                    {userHits.length > 0 ? (
                      <div className="max-h-40 overflow-y-auto rounded-md border">
                        {userHits.map((hit) => {
                          const label =
                            `${hit.firstName} ${hit.lastName}`.trim() || hit.email;
                          return (
                          <button
                            key={hit.id}
                            type="button"
                            className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                            onClick={() => {
                              setForm((prev) => ({
                                ...prev,
                                userId: hit.id,
                                userLabel: label,
                              }));
                              setUserHits([]);
                              setUserQuery('');
                            }}
                          >
                            {label}
                          </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select
                    value={form.departmentId}
                    onValueChange={(value) => setForm((prev) => ({ ...prev, departmentId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {departments.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Position</Label>
                  <Select
                    value={form.positionId}
                    onValueChange={(value) => setForm((prev) => ({ ...prev, positionId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {positions.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="staff-number">Staff number</Label>
                  <Input
                    id="staff-number"
                    value={form.staffNumber}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, staffNumber: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(value) => setForm((prev) => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STAFF_STATUSES.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item.replace(/_/g, ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="work-email">Work email</Label>
                <Input
                  id="work-email"
                  type="email"
                  value={form.workEmail}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, workEmail: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="work-phone">Work phone</Label>
                <Input
                  id="work-phone"
                  value={form.workPhone}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, workPhone: event.target.value }))
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="button" disabled={saving} onClick={() => void createStaff()}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PermissionGate>
  );
}
