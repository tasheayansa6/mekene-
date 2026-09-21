'use client';

import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api/client';
import { useAuth } from '@/components/providers/AuthProvider';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PermissionGate } from '@/components/admin/PermissionGate';
import { PageHeader } from '@/components/admin/PageHeader';

interface RoleRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  hierarchy: number;
  isSystem: boolean;
  isPrivileged: boolean;
  userCount: number;
  permissionCount: number;
}

export default function AdminRolesPage() {
  const { user } = useAuth();
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void apiGet<{ roles: RoleRow[] }>('/admin/roles').then((result) => {
      setRoles(result.data?.roles || []);
      setLoading(false);
    });
  }, []);

  return (
    <PermissionGate permission="roles.view">
    <div className="space-y-6">
      <PageHeader
        title="Roles & Permissions"
        description="System roles control access through permissions. Only Super Administrators can change highly privileged role assignments and permission maps."
      />
      {user?.role.slug !== 'super_admin' ? (
        <p className="text-sm text-muted-foreground">
          You can view roles. Managing Super Administrator privileges is restricted.
        </p>
      ) : null}
      {loading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {roles.map((role) => (
            <Card key={role.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                  <span>{role.name}</span>
                  {role.isPrivileged ? <Badge>Privileged</Badge> : null}
                </CardTitle>
                <CardDescription>{role.description}</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p>{role.userCount} users · {role.permissionCount} permissions</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
    </PermissionGate>
  );
}
