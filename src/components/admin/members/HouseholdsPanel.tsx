'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { apiGet, apiPost } from '@/lib/api/client';
import { useAuth } from '@/components/providers/AuthProvider';
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
import { Skeleton } from '@/components/ui/skeleton';
import { publicErrorMessage } from '@/lib/admin/http-error';

interface HouseholdRow {
  id: string;
  name: string;
  memberCount: number;
  members: Array<{ id: string; name: string; membershipNumber: string | null }>;
}

export function HouseholdsPanel() {
  const { can } = useAuth();
  const [rows, setRows] = useState<HouseholdRow[] | null>(null);
  const [name, setName] = useState('');

  function load() {
    void apiGet<{ households: HouseholdRow[] }>('/admin/members/households').then((result) => {
      setRows(result.data?.households || []);
    });
  }

  useEffect(() => {
    load();
  }, []);

  async function create() {
    const result = await apiPost('/admin/members/households', { name });
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    toast.success('Household created.');
    setName('');
    load();
  }

  if (rows === null) return <Skeleton className="h-48 w-full" />;

  return (
    <PermissionGate permission="members.view">
      <div className="space-y-6">
        <PageHeader
          title="Households"
          description="Households are optional and are not shown on the public website."
        />
        {can('members.manage') ? (
          <Card>
            <CardHeader>
              <CardTitle>Create household</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 sm:flex-row">
              <div className="flex-1 space-y-2">
                <Label htmlFor="household-name">Name</Label>
                <Input id="household-name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <Button className="sm:self-end" onClick={() => void create()} disabled={!name.trim()}>
                Create
              </Button>
            </CardContent>
          </Card>
        ) : null}
        {rows.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No households yet</CardTitle>
              <CardDescription>Members do not have to belong to a household.</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {rows.map((row) => (
              <Card key={row.id}>
                <CardHeader>
                  <CardTitle>{row.name}</CardTitle>
                  <CardDescription>{row.memberCount} member{row.memberCount === 1 ? '' : 's'}</CardDescription>
                </CardHeader>
                <CardContent className="text-sm">
                  {row.members.map((member) => (
                    <p key={member.id}>
                      {member.name}
                      {member.membershipNumber ? ` · ${member.membershipNumber}` : ''}
                    </p>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PermissionGate>
  );
}
