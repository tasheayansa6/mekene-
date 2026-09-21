'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { apiGet, apiPost } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { publicErrorMessage } from '@/lib/admin/http-error';

interface BookableResource {
  id: string;
  name: string;
  slug: string;
  quantity: number;
  status: string;
}

interface Reservation {
  id: string;
  resourceId: string;
  resource: BookableResource;
  quantity: number;
  startAt: string;
  endAt: string;
  status: string;
}

export function EventResourcesPanel({ eventId }: { eventId: string }) {
  const [resources, setResources] = useState<BookableResource[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [resourceId, setResourceId] = useState('');
  const [quantity, setQuantity] = useState('1');

  function load() {
    void apiGet<BookableResource[]>('/admin/resources').then((result) => {
      setResources(result.data || []);
      if (result.data?.[0] && !resourceId) setResourceId(result.data[0].id);
    });
    void apiGet<Reservation[]>(`/admin/events/${eventId}/resources`).then((result) => {
      setReservations(result.data || []);
    });
  }

  useEffect(() => {
    load();
  }, [eventId]);

  async function reserve() {
    if (!resourceId) return;
    const now = new Date();
    const start = new Date(now.getTime() + 60 * 60_000);
    const end = new Date(now.getTime() + 3 * 60 * 60_000);
    const result = await apiPost(`/admin/events/${eventId}/resources`, {
      resourceId,
      quantity: Number(quantity || 1),
      startAt: start.toISOString(),
      endAt: end.toISOString(),
    });
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    toast.success('Resource reserved for this event.');
    load();
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 rounded-md border p-4 sm:grid-cols-[1fr_auto_auto]">
        <div className="space-y-1">
          <Label htmlFor="resource-select">Resource</Label>
          <select
            id="resource-select"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={resourceId}
            onChange={(e) => setResourceId(e.target.value)}
          >
            {resources.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name} (qty {row.quantity})
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="resource-qty">Quantity</Label>
          <Input id="resource-qty" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        </div>
        <Button className="self-end" onClick={() => void reserve()}>
          Reserve
        </Button>
      </div>

      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="p-3">Resource</th>
              <th className="p-3">Qty</th>
              <th className="p-3">Window</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {!reservations.length ? (
              <tr>
                <td colSpan={4} className="p-4 text-muted-foreground">
                  No reservations for this event.
                </td>
              </tr>
            ) : (
              reservations.map((row) => (
                <tr key={row.id} className="border-b">
                  <td className="p-3">{row.resource.name}</td>
                  <td className="p-3">{row.quantity}</td>
                  <td className="p-3">
                    {new Date(row.startAt).toLocaleString()} – {new Date(row.endAt).toLocaleString()}
                  </td>
                  <td className="p-3">{row.status}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
