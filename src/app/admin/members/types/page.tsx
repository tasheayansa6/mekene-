'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { apiGet, apiPost } from '@/lib/api/client';
import { PageHeader } from '@/components/admin/PageHeader';
import { PermissionGate } from '@/components/admin/PermissionGate';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { publicErrorMessage } from '@/lib/admin/http-error';

interface TypeRow {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  sortOrder: number;
}

export default function MembershipTypesPage() {
  const [rows, setRows] = useState<TypeRow[]>([]);
  const [name, setName] = useState('');

  function load() {
    void apiGet<TypeRow[]>('/admin/members/types').then((r) => setRows(r.data || []));
  }

  useEffect(() => {
    load();
  }, []);

  async function create() {
    const result = await apiPost('/admin/members/types', { name });
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    setName('');
    toast.success('Type created.');
    load();
  }

  return (
    <PermissionGate permission="members.manage">
      <div className="space-y-6">
        <PageHeader
          title="Membership types"
          description="Configurable categories such as Full Member, Youth, Visitor — not hard-coded policy."
        />
        <form
          className="flex flex-wrap gap-3 rounded-md border p-4"
          onSubmit={(e) => {
            e.preventDefault();
            void create();
          }}
        >
          <div className="space-y-1">
            <Label htmlFor="type-name">Name</Label>
            <Input id="type-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <Button type="submit" className="self-end">
            Add type
          </Button>
        </form>
        <ul className="divide-y rounded-md border">
          {rows.map((row) => (
            <li key={row.id} className="flex items-center justify-between p-3 text-sm">
              <span>
                {row.name} <span className="text-muted-foreground">({row.slug})</span>
              </span>
              <span className="text-muted-foreground">{row.isActive ? 'Active' : 'Inactive'}</span>
            </li>
          ))}
        </ul>
      </div>
    </PermissionGate>
  );
}
