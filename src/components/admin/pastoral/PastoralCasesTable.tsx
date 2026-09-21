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
import { PASTORAL_CASE_STATUSES, PASTORAL_PRIORITIES } from '@/lib/pastoral/status';

interface CaseRow {
  id: string;
  title: string;
  status: string;
  statusLabel: string;
  priority: string;
  priorityLabel: string;
  openedAt: string | null;
  updatedAt: string;
  category: { id: string; name: string } | null;
  member: { id: string; name: string; membershipNumber: string | null } | null;
  assignedTo: { id: string; name: string | null } | null;
}

interface CategoryOption {
  id: string;
  name: string;
  isActive: boolean;
}

function priorityVariant(priority: string) {
  if (priority === 'high') return 'destructive' as const;
  if (priority === 'low') return 'outline' as const;
  return 'secondary' as const;
}

export function PastoralCasesTable({ assignedToMe }: { assignedToMe?: boolean } = {}) {
  const { can, user } = useAuth();
  const [rows, setRows] = useState<CaseRow[]>([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [priority, setPriority] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [memberQuery, setMemberQuery] = useState('');
  const [memberHits, setMemberHits] = useState<
    Array<{ id: string; displayName: string; membershipNumber: string | null }>
  >([]);
  const [form, setForm] = useState({
    memberId: '',
    memberLabel: '',
    title: '',
    categoryId: 'none',
    priority: 'normal',
    summary: '',
  });
  const [saving, setSaving] = useState(false);

  const params = useMemo(() => {
    const next: Record<string, string> = {
      page: String(page),
      pageSize: '20',
      sort: 'updatedAt',
      dir: 'desc',
    };
    if (q) next.q = q;
    if (status !== 'all') next.status = status;
    if (priority !== 'all') next.priority = priority;
    if (assignedToMe && user?.id) next.assignedTo = user.id;
    return next;
  }, [q, status, priority, page, assignedToMe, user?.id]);

  function load() {
    setLoading(true);
    void apiGet<CaseRow[]>('/admin/pastoral/cases', params).then((result) => {
      setRows(result.data || []);
      setTotal(result.pagination?.totalItems || 0);
      setError(result.success ? null : result.message);
      setLoading(false);
    });
  }

  useEffect(() => {
    const handle = setTimeout(load, 200);
    return () => clearTimeout(handle);
  }, [params]);

  useEffect(() => {
    void apiGet<CategoryOption[]>('/admin/pastoral/categories').then((result) => {
      setCategories((result.data || []).filter((item) => item.isActive));
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

  async function createCase() {
    if (!form.memberId || form.title.trim().length < 3) {
      toast.error('Member and title are required.');
      return;
    }
    setSaving(true);
    const result = await apiPost<CaseRow>('/admin/pastoral/cases', {
      memberId: form.memberId,
      title: form.title.trim(),
      categoryId: form.categoryId === 'none' ? null : form.categoryId,
      priority: form.priority,
      summary: form.summary.trim() || null,
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
      title: '',
      categoryId: 'none',
      priority: 'normal',
      summary: '',
    });
    setMemberQuery('');
    setMemberHits([]);
    load();
  }

  const columns: AdminColumn<CaseRow>[] = [
    {
      key: 'title',
      header: 'Title',
      render: (row) => row.title,
    },
    {
      key: 'member',
      header: 'Member',
      render: (row) => row.member?.name || '—',
    },
    {
      key: 'category',
      header: 'Category',
      hideOnMobile: true,
      render: (row) => row.category?.name || '—',
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge variant="secondary">{row.statusLabel}</Badge>,
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (row) => <Badge variant={priorityVariant(row.priority)}>{row.priorityLabel}</Badge>,
    },
    {
      key: 'assignedTo',
      header: 'Assigned',
      hideOnMobile: true,
      render: (row) => row.assignedTo?.name || '—',
    },
    {
      key: 'updatedAt',
      header: 'Updated',
      hideOnMobile: true,
      render: (row) => new Date(row.updatedAt).toLocaleDateString(),
    },
  ];

  return (
    <PermissionGate permission="pastoral.view">
      <div className="space-y-6">
        <PageHeader
          title={assignedToMe ? 'My pastoral cases' : 'Pastoral care cases'}
          description="Case summaries appear only when you open a case. Notes require pastoral note permission."
          actions={
            can('pastoral.create') ? (
              <Button type="button" onClick={() => setCreateOpen(true)}>
                New case
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
          emptyTitle="No pastoral cases yet."
          emptyDescription="Create a case to begin confidential pastoral care tracking."
          search={q}
          onSearchChange={(value) => {
            setPage(1);
            setQ(value);
          }}
          searchPlaceholder="Search titles and members"
          filters={
            <>
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
                  {PASTORAL_CASE_STATUSES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={priority}
                onValueChange={(value) => {
                  setPage(1);
                  setPriority(value);
                }}
              >
                <SelectTrigger className="w-full sm:w-40" aria-label="Filter by priority">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All priorities</SelectItem>
                  {PASTORAL_PRIORITIES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          }
          page={page}
          pageSize={20}
          totalItems={total}
          onPageChange={setPage}
          rowActions={(row) => (
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/pastoral-care/cases/${row.id}`}>Open</Link>
            </Button>
          )}
        />

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>New pastoral case</DialogTitle>
              <DialogDescription>
                Keep the title non-sensitive. Detailed notes belong on the case page.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="case-member">Member</Label>
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
                      id="case-member"
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
                                  memberLabel: `${member.displayName}${
                                    member.membershipNumber ? ` · ${member.membershipNumber}` : ''
                                  }`,
                                }));
                                setMemberHits([]);
                                setMemberQuery('');
                              }}
                            >
                              {member.displayName}
                              {member.membershipNumber ? ` · ${member.membershipNumber}` : ''}
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="case-title">Title</Label>
                <Input
                  id="case-title"
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={form.categoryId}
                    onValueChange={(value) => setForm((current) => ({ ...current, categoryId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {categories.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select
                    value={form.priority}
                    onValueChange={(value) => setForm((current) => ({ ...current, priority: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PASTORAL_PRIORITIES.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="case-summary">Summary</Label>
                <Textarea
                  id="case-summary"
                  value={form.summary}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, summary: event.target.value }))
                  }
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={() => void createCase()} disabled={saving}>
                Create case
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PermissionGate>
  );
}
