'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';

import { apiGet, apiPatch, apiPost, ensureCsrfToken } from '@/lib/api/client';
import type { ApiResponse } from '@/types';
import { PageHeader } from '@/components/admin/PageHeader';
import { PermissionGate } from '@/components/admin/PermissionGate';
import { ApiErrorAlert } from '@/components/admin/ApiErrorAlert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Card,
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
import { publicErrorMessage } from '@/lib/admin/http-error';

interface Capacity {
  capacity: number | null;
  registered: number;
  waitlisted: number;
  available: number | null;
  isFull: boolean;
}

interface RegRow {
  id: string;
  reference: string;
  status: string;
  waitlistPosition: number | null;
  registeredAt: string;
  cancelledAt: string | null;
  guestName: string | null;
  guestEmail: string | null;
  guestPartySize: number;
  user: { id: string; name: string; email: string } | null;
}

type ListResult = ApiResponse<RegRow[]> & { capacity?: Capacity };

export function EventRegistrationsAdmin() {
  const params = useParams<{ id: string }>();
  const eventId = params.id;
  const [rows, setRows] = useState<RegRow[]>([]);
  const [capacity, setCapacity] = useState<Capacity | null>(null);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState('');
  const [manualPending, setManualPending] = useState(false);

  const queryParams = useMemo(() => {
    const next: Record<string, string> = {
      page: String(page),
      pageSize: '20',
    };
    if (q.trim()) next.q = q.trim();
    if (status !== 'all') next.status = status;
    return next;
  }, [q, status, page]);

  function load() {
    if (!eventId) return;
    setLoading(true);
    void apiGet<RegRow[]>(`/admin/events/${eventId}/registrations`, queryParams).then((raw) => {
      const result = raw as ListResult;
      setRows(result.data || []);
      setTotal(result.pagination?.totalItems || 0);
      setCapacity(result.capacity ?? null);
      setError(result.success ? null : result.message);
      setLoading(false);
    });
  }

  useEffect(() => {
    const handle = setTimeout(load, 200);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, queryParams]);

  async function manualRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!eventId || !userId.trim()) return;
    setManualPending(true);
    await ensureCsrfToken();
    const result = await apiPost(`/admin/events/${eventId}/registrations`, {
      userId: userId.trim(),
    });
    setManualPending(false);
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    toast.success(result.message || 'Member registered.');
    setUserId('');
    load();
  }

  async function updateStatus(id: string, nextStatus: string) {
    await ensureCsrfToken();
    const result = await apiPatch(`/admin/events/registrations/${id}`, {
      status: nextStatus,
      ...(nextStatus === 'cancelled' ? { action: 'cancel' } : {}),
    });
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    toast.success(result.message || 'Updated.');
    load();
  }

  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <PermissionGate permission="events.view">
      <div className="space-y-6">
        <PageHeader
          title="Event registrations"
          description="Search, filter, and manage registrations. Export includes CSV columns for reporting."
          actions={
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <a href={`/api/v1/admin/events/${eventId}/export`}>Export CSV</a>
              </Button>
              <Button asChild variant="ghost">
                <Link href={`/admin/events/${eventId}`}>Edit event</Link>
              </Button>
            </div>
          }
        />

        {capacity ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader>
                <CardDescription>Capacity</CardDescription>
                <CardTitle>{capacity.capacity ?? 'Unlimited'}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Registered</CardDescription>
                <CardTitle>{capacity.registered}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Waitlisted</CardDescription>
                <CardTitle>{capacity.waitlisted}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Available</CardDescription>
                <CardTitle>
                  {capacity.available == null ? '—' : capacity.available}
                  {capacity.isFull ? ' (full)' : ''}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>
        ) : null}

        <form
          className="flex flex-col gap-3 rounded-md border p-4 sm:flex-row sm:items-end"
          onSubmit={manualRegister}
        >
          <div className="min-w-0 flex-1 space-y-2">
            <Label htmlFor="manualUserId">Manual register (user id)</Label>
            <Input
              id="manualUserId"
              name="userId"
              placeholder="User id"
              value={userId}
              onChange={(ev) => setUserId(ev.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={manualPending}>
            {manualPending ? 'Registering…' : 'Register member'}
          </Button>
        </form>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="min-w-0 flex-1 space-y-2">
            <Label htmlFor="regSearch">Search</Label>
            <Input
              id="regSearch"
              value={q}
              onChange={(ev) => {
                setPage(1);
                setQ(ev.target.value);
              }}
              placeholder="Name, email, or reference"
            />
          </div>
          <div className="space-y-2 sm:w-48">
            <Label htmlFor="regStatus">Status</Label>
            <Select
              value={status}
              onValueChange={(value) => {
                setPage(1);
                setStatus(value);
              }}
            >
              <SelectTrigger id="regStatus" aria-label="Filter by status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="registered">Registered</SelectItem>
                <SelectItem value="waitlisted">Waitlisted</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="attended">Attended</SelectItem>
                <SelectItem value="no_show">No show</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {error ? <ApiErrorAlert message={error} /> : null}

        {loading ? (
          <Skeleton className="h-48 w-full" />
        ) : rows.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No registrations found</CardTitle>
              <CardDescription>Try a different search or status filter.</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <caption className="sr-only">Event registrations</caption>
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-3 font-medium">Name</th>
                  <th className="p-3 font-medium">Reference</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3 font-medium">Registered</th>
                  <th className="p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t">
                    <td className="p-3">
                      <p className="font-medium">{row.user?.name || row.guestName || 'Guest'}</p>
                      <p className="text-xs text-muted-foreground">
                        {row.user?.email || row.guestEmail || '—'}
                      </p>
                    </td>
                    <td className="p-3 font-mono text-xs">{row.reference}</td>
                    <td className="p-3">
                      <Badge variant={row.status === 'cancelled' ? 'destructive' : 'secondary'}>
                        {row.status}
                      </Badge>
                      {row.waitlistPosition != null ? (
                        <span className="ml-2 text-xs text-muted-foreground">
                          #{row.waitlistPosition}
                        </span>
                      ) : null}
                    </td>
                    <td className="p-3">{new Date(row.registeredAt).toLocaleString()}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-2">
                        {row.status !== 'confirmed' && row.status !== 'cancelled' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStatus(row.id, 'confirmed')}
                          >
                            Confirm
                          </Button>
                        ) : null}
                        {row.status !== 'cancelled' ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => updateStatus(row.id, 'cancelled')}
                          >
                            Cancel
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 ? (
          <div className="flex justify-center gap-3">
            <Button
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        ) : null}
      </div>
    </PermissionGate>
  );
}
