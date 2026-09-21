'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { apiPost } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { publicErrorMessage } from '@/lib/admin/http-error';

export function EventCheckInPanel({ eventId }: { eventId: string }) {
  const [reference, setReference] = useState('');
  const [last, setLast] = useState<{ reference: string; status: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!reference.trim()) return;
    setLoading(true);
    const result = await apiPost(`/admin/events/${eventId}/check-in`, {
      reference: reference.trim().toUpperCase(),
    });
    setLoading(false);
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    const data = result.data as { reference: string; status: string };
    setLast(data);
    setReference('');
    toast.success('Check-in recorded.');
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <form className="space-y-3 rounded-md border p-4" onSubmit={(e) => void submit(e)}>
        <div className="space-y-1">
          <Label htmlFor="checkin-ref">Registration reference</Label>
          <Input
            id="checkin-ref"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="BME-EVT-000001"
            autoComplete="off"
          />
        </div>
        <Button type="submit" disabled={loading}>
          Check in
        </Button>
      </form>
      {last ? (
        <p className="text-sm text-muted-foreground">
          Last check-in: {last.reference} ({last.status})
        </p>
      ) : null}
    </div>
  );
}
