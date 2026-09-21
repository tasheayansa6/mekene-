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

interface TeamRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  memberCount?: number;
  ministry: { id: string; name: string } | null;
  leaderUser: { id: string; name: string | null } | null;
  updatedAt: string;
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

export function TeamsPanel() {
  const { can } = useAuth();
  const [rows, setRows] = useState<TeamRow[]>([]);
  const [ministries, setMinistries] = useState<MinistryOption[]>([]);
  const [q, setQ] = useState('');
  const [ministryId, setMinistryId] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    ministryId: '',
    name: '',
    slug: '',
    description: '',
  });

  const params = useMemo(() => {
    const next: Record<string, string> = {
      page: String(page),
      pageSize: '20',
    };
    if (q.trim()) next.q = q.trim();
    if (ministryId !== 'all') next.ministryId = ministryId;
    return next;
  }, [page, q, ministryId]);

  function load() {
    setLoading(true);
    void apiGet<TeamRow[]>('/admin/ministry/teams', params).then((result) => {
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
    void apiGet<MinistryOption[]>('/admin/ministries', { pageSize: '100' }).then((result) => {
      setMinistries(result.data || []);
    });
  }, []);

  async function createTeam() {
    if (!form.ministryId || form.name.trim().length < 2) {
      toast.error('Ministry and name are required.');
      return;
    }
    setSaving(true);
    const result = await apiPost<TeamRow>('/admin/ministry/teams', {
      ministryId: form.ministryId,
      name: form.name.trim(),
      slug: form.slug.trim() || slugify(form.name),
      description: form.description.trim() || null,
    });
    setSaving(false);
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    toast.success('Saved');
    setCreateOpen(false);
    setForm({ ministryId: '', name: '', slug: '', description: '' });
    load();
  }

  const columns: AdminColumn<TeamRow>[] = [
    {
      key: 'name',
      header: 'Team',
      render: (row) => (
        <Link className="font-medium hover:underline" href={`/admin/ministry/teams/${row.id}`}>
          {row.name}
        </Link>
      ),
    },
    {
      key: 'ministry',
      header: 'Ministry',
      render: (row) => row.ministry?.name || '—',
    },
    {
      key: 'leaderUser',
      header: 'Leader',
      hideOnMobile: true,
      render: (row) => row.leaderUser?.name || '—',
    },
    {
      key: 'memberCount',
      header: 'Members',
      hideOnMobile: true,
      render: (row) => row.memberCount ?? '—',
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (row) => (
        <Badge variant={row.isActive ? 'secondary' : 'outline'}>
          {row.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
  ];

  return (
    <PermissionGate permission="ministries.view">
      <div className="space-y-6">
        <PageHeader
          title="Ministry teams"
          description="Organize volunteers into teams under each ministry."
          actions={
            can('ministries.assign') ? (
              <Button type="button" onClick={() => setCreateOpen(true)}>
                Add team
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
          emptyTitle="No ministry teams yet."
          search={q}
          onSearchChange={(value) => {
            setQ(value);
            setPage(1);
          }}
          searchPlaceholder="Search teams…"
          page={page}
          pageSize={20}
          totalItems={total}
          onPageChange={setPage}
          filters={
            <Select
              value={ministryId}
              onValueChange={(value) => {
                setMinistryId(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-52" aria-label="Filter by ministry">
                <SelectValue placeholder="Ministry" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All ministries</SelectItem>
                {ministries.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
          rowActions={(row) => (
            <Button asChild size="sm" variant="outline">
              <Link href={`/admin/ministry/teams/${row.id}`}>Open</Link>
            </Button>
          )}
        />

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create team</DialogTitle>
              <DialogDescription>Teams belong to a single ministry.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Ministry</Label>
                <Select
                  value={form.ministryId || 'none'}
                  onValueChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      ministryId: value === 'none' ? '' : value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select ministry" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select ministry</SelectItem>
                    {ministries.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="team-name">Name</Label>
                <Input
                  id="team-name"
                  value={form.name}
                  onChange={(event) => {
                    const name = event.target.value;
                    setForm((prev) => ({
                      ...prev,
                      name,
                      slug: prev.slug || slugify(name),
                    }));
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="team-slug">Slug</Label>
                <Input
                  id="team-slug"
                  value={form.slug}
                  onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="team-description">Description</Label>
                <Textarea
                  id="team-description"
                  value={form.description}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, description: event.target.value }))
                  }
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="button" disabled={saving} onClick={() => void createTeam()}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PermissionGate>
  );
}
