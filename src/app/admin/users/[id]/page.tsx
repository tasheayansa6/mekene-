'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { apiGet, apiPost } from '@/lib/api/client';
import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { PermissionGate } from '@/components/admin/PermissionGate';
import { PageHeader } from '@/components/admin/PageHeader';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { ApiErrorAlert } from '@/components/admin/ApiErrorAlert';

interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  status: string;
  isVerified: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  role: { id: string; slug: string; name: string };
}

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>();
  const { user: actor, hasPermission } = useAuth();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [roles, setRoles] = useState<Array<{ slug: string; name: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  async function load() {
    setLoading(true);
    const result = await apiGet<{ user: AdminUser }>(`/admin/users/${params.id}`);
    if (!result.success || !result.data?.user) {
      setError(result.message || 'User not found');
      setUser(null);
    } else {
      setUser(result.data.user);
      setError(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
      void apiGet<{ roles: Array<{ slug: string; name: string }> }>('/admin/roles').then(
        (result) => {
          if (result.success) setRoles(result.data?.roles || []);
        }
      );
    }, 0);
    return () => window.clearTimeout(timer);
  }, [params.id]);

  async function changeStatus(status: string) {
    setStatusLoading(true);
    const result = await apiPost<{ user: AdminUser }>(
      `/admin/users/${params.id}/status`,
      { status }
    );
    setStatusLoading(false);
    if (!result.success) {
      toast.error(result.message || 'Unable to update status.');
      return;
    }
    toast.success('Account status updated.');
    setPendingStatus(null);
    setUser(result.data!.user);
  }

  async function changeRole(roleSlug: string) {
    const result = await apiPost<{ user: AdminUser }>(
      `/admin/users/${params.id}/role`,
      { roleSlug }
    );
    if (!result.success) {
      toast.error(result.message || 'Unable to update role.');
      return;
    }
    toast.success('Role updated.');
    setUser(result.data!.user);
  }

  if (loading) return <Skeleton className="h-72 w-full" />;
  if (error || !user) {
    return <ApiErrorAlert message={error || 'User not found'} status={404} />;
  }

  const canManage = hasPermission('users', 'manage');
  const assignableRoles = roles.filter((role) => {
    if (actor?.role.slug === 'super_admin') return true;
    return role.slug !== 'super_admin' && role.slug !== 'admin';
  });

  return (
    <PermissionGate permission="users.view">
    <div className="space-y-6">
      <PageHeader
        title={`${user.firstName} ${user.lastName}`}
        description={user.email}
      />

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Administrative details. Passwords are never displayed.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <p><span className="text-muted-foreground">Phone:</span> {user.phone || '—'}</p>
          <p><span className="text-muted-foreground">Role:</span> {user.role.name}</p>
          <p>
            <span className="text-muted-foreground">Status:</span>{' '}
            <Badge>{user.status}</Badge>
          </p>
          <p><span className="text-muted-foreground">Verified:</span> {user.isVerified ? 'Yes' : 'No'}</p>
          <p><span className="text-muted-foreground">Created:</span> {new Date(user.createdAt).toLocaleString()}</p>
          <p>
            <span className="text-muted-foreground">Last login:</span>{' '}
            {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'}
          </p>
        </CardContent>
      </Card>

      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle>Manage</CardTitle>
            <CardDescription>
              Status and privileged roles are assigned only by authorized administrators.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => changeStatus('active')}>
                Activate
              </Button>
              <Button variant="outline" onClick={() => setPendingStatus('suspended')}>
                Suspend
              </Button>
              <Button variant="outline" onClick={() => setPendingStatus('deactivated')}>
                Deactivate
              </Button>
            </div>
            <div className="max-w-sm">
              <p className="mb-2 text-sm font-medium">Assign role</p>
              <Select value={user.role.slug} onValueChange={changeRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {assignableRoles.map((role) => (
                    <SelectItem key={role.slug} value={role.slug}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      ) : null}
      <ConfirmDialog
        open={Boolean(pendingStatus)}
        onOpenChange={(open) => !open && setPendingStatus(null)}
        title={pendingStatus === 'suspended' ? 'Suspend this account?' : 'Deactivate this account?'}
        description="The user will lose access until an administrator restores the account. This action is recorded in the audit log."
        confirmLabel={pendingStatus === 'suspended' ? 'Suspend' : 'Deactivate'}
        destructive
        loading={statusLoading}
        onConfirm={() => pendingStatus && changeStatus(pendingStatus)}
      />
    </div>
    </PermissionGate>
  );
}
