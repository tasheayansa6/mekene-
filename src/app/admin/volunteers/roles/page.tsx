'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { apiGet, apiPost } from '@/lib/api/client';
import { PageHeader } from '@/components/admin/PageHeader';
import { PermissionGate } from '@/components/admin/PermissionGate';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { publicErrorMessage } from '@/lib/admin/http-error';

interface RoleRow {
  id: string;
  name: string;
  slug: string;
  slotsRequired: number;
  ministryId: string | null;
}

export default function AdminVolunteerRolesPage() {
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [name, setName] = useState('');
  const [slotsRequired, setSlotsRequired] = useState('1');
  const [saving, setSaving] = useState(false);

  function load() {
    void apiGet<{ roles: RoleRow[] }>('/admin/volunteers/roles').then((result) => {
      setRoles(result.data?.roles || []);
    });
  }

  useEffect(() => {
    load();
  }, []);

  async function createRole() {
    if (name.trim().length < 2) {
      toast.error('Enter a role name.');
      return;
    }
    setSaving(true);
    const result = await apiPost('/admin/volunteers/roles', {
      name: name.trim(),
      slotsRequired: Number(slotsRequired) || 1,
    });
    setSaving(false);
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    toast.success('Created');
    setName('');
    load();
  }

  return (
    <PermissionGate resource="volunteers" action="manage">
      <div className="space-y-6">
        <PageHeader
          title="Volunteer roles"
          description="Configurable service roles. Do not hard-code ministry names into the product."
        />
        <Card>
          <CardHeader>
            <CardTitle>Add role</CardTitle>
            <CardDescription>Roles can later be linked to ministries, skills, and training.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-[1fr_120px_auto] sm:items-end">
            <div className="space-y-2">
              <Label htmlFor="role-name">Name</Label>
              <Input id="role-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role-slots">Slots</Label>
              <Input
                id="role-slots"
                type="number"
                min={1}
                value={slotsRequired}
                onChange={(e) => setSlotsRequired(e.target.value)}
              />
            </div>
            <Button type="button" disabled={saving} onClick={() => void createRole()}>
              Add
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Catalog</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {roles.map((role) => (
              <p key={role.id}>
                {role.name} · {role.slotsRequired} slot(s)
              </p>
            ))}
          </CardContent>
        </Card>
      </div>
    </PermissionGate>
  );
}
