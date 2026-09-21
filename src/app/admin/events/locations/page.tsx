'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { apiDelete, apiGet, apiPost } from '@/lib/api/client';
import { PageHeader } from '@/components/admin/PageHeader';
import { PermissionGate } from '@/components/admin/PermissionGate';
import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { publicErrorMessage } from '@/lib/admin/http-error';

interface LocationRow {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  usage: number;
}

export default function EventLocationsPage() {
  const { can } = useAuth();
  const [rows, setRows] = useState<LocationRow[]>([]);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [pendingId, setPendingId] = useState<string | null>(null);

  function load() {
    void apiGet<LocationRow[]>('/admin/events/locations').then((result) => {
      setRows(result.data || []);
    });
  }

  useEffect(() => {
    load();
  }, []);

  async function create() {
    const result = await apiPost('/admin/events/locations', { name, address: address || null });
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    toast.success('Location created.');
    setName('');
    setAddress('');
    load();
  }

  return (
    <PermissionGate permission="events.view">
      <div className="space-y-6">
        <PageHeader
          title="Event locations"
          description="Reusable venues for church events. Coordinates are optional."
        />
        {can('events.create') ? (
          <form
            className="grid gap-3 rounded-md border p-4 sm:grid-cols-[1fr_1fr_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              void create();
            }}
          >
            <div className="space-y-1">
              <Label htmlFor="location-name">Name</Label>
              <Input id="location-name" value={name} onChange={(event) => setName(event.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="location-address">Address</Label>
              <Input
                id="location-address"
                value={address}
                onChange={(event) => setAddress(event.target.value)}
              />
            </div>
            <Button type="submit" className="self-end">
              Add location
            </Button>
          </form>
        ) : null}
        <ul className="divide-y rounded-md border">
          {rows.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
              <div>
                <p className="font-medium">{row.name}</p>
                <p className="text-sm text-muted-foreground">
                  {row.address || 'No address'} · {row.usage} events
                </p>
              </div>
              {can('events.delete') ? (
                <Button variant="outline" size="sm" onClick={() => setPendingId(row.id)}>
                  Delete
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
        <ConfirmDialog
          open={Boolean(pendingId)}
          onOpenChange={(open) => !open && setPendingId(null)}
          title="Delete this location?"
          description="Locations in use cannot be deleted. Unused locations are removed permanently."
          confirmLabel="Delete"
          destructive
          onConfirm={async () => {
            if (!pendingId) return;
            const result = await apiDelete(`/admin/events/locations/${pendingId}`);
            if (!result.success) {
              toast.error(publicErrorMessage(result.status, result.message));
              return;
            }
            setPendingId(null);
            load();
          }}
        />
      </div>
    </PermissionGate>
  );
}
