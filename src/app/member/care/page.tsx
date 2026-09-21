'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPatch, apiPost } from '@/lib/api/client';
import { ApiErrorAlert } from '@/components/admin/ApiErrorAlert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface CareDashboard {
  prayerRequests: Array<{ id: string; title: string; status: string }>;
  careCases: Array<{
    id: string;
    title: string;
    statusLabel: string;
    openedAt: string | null;
  }>;
  upcomingVisits: Array<{
    id: string;
    scheduledAt: string;
    statusLabel: string;
    locationLabel: string;
  }>;
  followUps: Array<{ id: string; task: string; statusLabel: string; dueDate: string | null }>;
}

export default function MemberCarePage() {
  const [data, setData] = useState<CareDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scheduledAt, setScheduledAt] = useState('');
  const [bookingMessage, setBookingMessage] = useState<string | null>(null);

  const load = useCallback(() => {
    void apiGet<CareDashboard>('/member/care').then((result) => {
      if (!result.success || !result.data) {
        setError(result.message);
        return;
      }
      setData(result.data);
      setError(null);
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function requestAppointment(e: React.FormEvent) {
    e.preventDefault();
    setBookingMessage(null);
    const result = await apiPost('/member/care/appointments', {
      scheduledAt: new Date(scheduledAt).toISOString(),
      locationType: 'church',
    });
    if (!result.success) {
      setBookingMessage(result.message);
      return;
    }
    setBookingMessage('Appointment requested.');
    setScheduledAt('');
    load();
  }

  async function cancelAppointment(id: string) {
    const result = await apiPatch(`/member/care/appointments/${id}`, {});
    if (!result.success) {
      setBookingMessage(result.message);
      return;
    }
    load();
  }

  if (error) return <ApiErrorAlert message={error} />;
  if (!data) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My care</h1>
        <p className="text-sm text-muted-foreground">
          Your prayer and care requests, appointments, and follow-ups. Internal pastoral notes
          are never shown here.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm">
          <Link href="/care/request">Request care</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href="/member/prayer">My prayer</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href="/prayer/request">New prayer request</Link>
        </Button>
      </div>

      {bookingMessage ? (
        <p className="text-sm text-muted-foreground" role="status">
          {bookingMessage}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Care requests</CardTitle>
          <CardDescription>Status only — no internal staff notes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.careCases.length === 0 ? (
            <p className="text-sm text-muted-foreground">No care requests.</p>
          ) : (
            data.careCases.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-2 border-b pb-2">
                <div>
                  <p className="font-medium">{c.title}</p>
                  <p className="text-xs text-muted-foreground">{c.openedAt}</p>
                </div>
                <Badge variant="secondary">{c.statusLabel}</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Appointments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.upcomingVisits.length === 0 ? (
            <p className="text-sm text-muted-foreground">No upcoming pastoral appointments.</p>
          ) : (
            data.upcomingVisits.map((v) => (
              <div key={v.id} className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{new Date(v.scheduledAt).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">
                    {v.locationLabel} · {v.statusLabel}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void cancelAppointment(v.id)}
                >
                  Cancel
                </Button>
              </div>
            ))
          )}
          <form className="space-y-2 border-t pt-4" onSubmit={(e) => void requestAppointment(e)}>
            <Label htmlFor="appt">Request appointment</Label>
            <Input
              id="appt"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              required
            />
            <Button type="submit" size="sm">
              Request
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Prayer requests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.prayerRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground">No prayer requests yet.</p>
          ) : (
            data.prayerRequests.map((p) => (
              <div key={p.id} className="flex justify-between gap-2 text-sm">
                <Link className="underline" href={`/member/prayer/${p.id}`}>
                  {p.title}
                </Link>
                <span className="text-muted-foreground">{p.status}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Follow-ups</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.followUps.length === 0 ? (
            <p className="text-sm text-muted-foreground">No follow-up tasks.</p>
          ) : (
            data.followUps.map((f) => (
              <div key={f.id} className="text-sm">
                <p className="font-medium">{f.task}</p>
                <p className="text-xs text-muted-foreground">{f.statusLabel}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
