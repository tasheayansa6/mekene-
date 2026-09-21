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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { publicErrorMessage } from '@/lib/admin/http-error';

interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  isVerified: boolean;
  role: { id: string; slug: string; name: string };
}

interface RoleOption {
  slug: string;
  name: string;
}

export default function AdminUsersPage() {
  const { can } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [q, setQ] = useState('');
  const [role, setRole] = useState('all');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    roleSlug: 'member',
  });

  useEffect(() => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('create') === '1') {
      setCreateOpen(true);
    }
  }, []);

  const params = useMemo(() => {
    const next: Record<string, string> = { page: String(page), pageSize: '20' };
    if (q) next.q = q;
    if (role !== 'all') next.role = role;
    if (status !== 'all') next.status = status;
    return next;
  }, [q, role, status, page]);

  function load() {
    setLoading(true);
    void apiGet<AdminUser[]>('/admin/users', params).then((result) => {
      setUsers(result.data || []);
      setTotal(result.pagination?.totalItems || result.data?.length || 0);
      setError(result.success ? null : result.message);
      setLoading(false);
    });
  }

  useEffect(() => {
    const handle = setTimeout(load, 250);
    return () => clearTimeout(handle);
  }, [params]);

  useEffect(() => {
    void apiGet<{ roles: RoleOption[] }>('/admin/roles').then((result) => {
      if (result.success) setRoles(result.data?.roles || []);
    });
  }, []);

  async function createUser() {
    setPending(true);
    const result = await apiPost<{ user: AdminUser }>('/admin/users', form);
    setPending(false);
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    toast.success('User created.');
    setCreateOpen(false);
    setForm({ firstName: '', lastName: '', email: '', phone: '', password: '', roleSlug: 'member' });
    load();
  }

  const columns: AdminColumn<AdminUser>[] = [
    { key: 'name', header: 'Name', render: (user) => `${user.firstName} ${user.lastName}` },
    { key: 'email', header: 'Email' },
    { key: 'role', header: 'Role', hideOnMobile: true, render: (user) => user.role.name },
    {
      key: 'status',
      header: 'Status',
      render: (user) => (
        <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>{user.status}</Badge>
      ),
    },
    {
      key: 'verified',
      header: 'Verified',
      hideOnMobile: true,
      render: (user) => (user.isVerified ? 'Yes' : 'No'),
    },
  ];

  return (
    <PermissionGate permission="users.view">
      <div className="space-y-6">
        <PageHeader
          title="Users"
          description="Search, filter, and manage church accounts. Role and status changes are enforced on the server."
          actions={
            can('users.create') ? (
              <Button onClick={() => setCreateOpen(true)}>Add User</Button>
            ) : null
          }
        />
        <AdminDataTable
          columns={columns}
          rows={users}
          getRowId={(user) => user.id}
          loading={loading}
          error={error}
          emptyTitle="No users found."
          emptyDescription="Try a different search or create a user."
          search={q}
          onSearchChange={(value) => {
            setPage(1);
            setQ(value);
          }}
          searchPlaceholder="Search name, email, or phone"
          filters={
            <>
              <Select
                value={role}
                onValueChange={(value) => {
                  setPage(1);
                  setRole(value);
                }}
              >
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  {roles.map((item) => (
                    <SelectItem key={item.slug} value={item.slug}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={status}
                onValueChange={(value) => {
                  setPage(1);
                  setStatus(value);
                }}
              >
                <SelectTrigger className="w-full sm:w-44">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="deactivated">Deactivated</SelectItem>
                </SelectContent>
              </Select>
            </>
          }
          page={page}
          pageSize={20}
          totalItems={total}
          onPageChange={setPage}
          rowActions={(user) => (
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/users/${user.id}`}>View</Link>
            </Button>
          )}
        />
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add User</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="cu-first">First name</Label>
                  <Input
                    id="cu-first"
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cu-last">Last name</Label>
                  <Input
                    id="cu-last"
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cu-email">Email</Label>
                <Input
                  id="cu-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cu-password">Temporary password</Label>
                <Input
                  id="cu-password"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={form.roleSlug}
                  onValueChange={(value) => setForm({ ...form, roleSlug: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((item) => (
                      <SelectItem key={item.slug} value={item.slug}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => void createUser()} disabled={pending}>
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PermissionGate>
  );
}
