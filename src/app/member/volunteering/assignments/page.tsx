'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { apiGet, apiPatch, apiPost } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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

interface AssignmentRow {
  id: string;
  roleName: string;
  status: string;
  statusLabel: string;
  scheduledAt: string;
  endsAt: string | null;
  event: { id: string; title: string } | null;
  ministry: { id: string; name: string } | null;
  team: { id: string; name: string } | null;
}

export default function MemberAssignmentsPage() {
  const [rows, setRows] = useState<AssignmentRow[] | null>(null);
  const [declineId, setDeclineId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState('');
  const [saving, setSaving] = useState(false);

  function load() {
    void apiGet<{ assignments: AssignmentRow[] }>('/members/me/volunteering/assignments').then(
      (result) => {
        setRows(result.data?.assignments || []);
      }
    );
  }

  useEffect(() => {
    load();
  }, []);

  async function confirm(id: string) {
    setSaving(true);
    const result = await apiPatch(`/members/me/volunteering/assignments/${id}/confirm`, {});
    setSaving(false);
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    toast.success('Updated');
    load();
  }

  async function decline(id: string) {
    setSaving(true);
    const result = await apiPatch(`/members/me/volunteering/assignments/${id}/decline`, {
      declineReason: declineReason.trim() || null,
    });
    setSaving(false);
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    toast.success('Updated');
    setDeclineId(null);
    setDeclineReason('');
    load();
  }

  async function requestReplacement(id: string) {
    setSaving(true);
    const result = await apiPost(`/members/me/volunteering/assignments/${id}/replacement`, {
      reason: 'Unavailable',
    });
    setSaving(false);
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    toast.success('Replacement requested');
    load();
  }

  async function checkIn(id: string) {
    setSaving(true);
    const result = await apiPost(`/members/me/volunteering/assignments/${id}/check-in`, {});
    setSaving(false);
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    toast.success('Checked in');
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-primary">My assignments</h1>
          <p className="text-sm text-muted-foreground">
            Confirm or decline service assignments assigned to you.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/member/volunteering">Back</Link>
        </Button>
      </div>

      {!rows ? (
        <Skeleton className="h-40 w-full" />
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            No assignments yet.
          </CardContent>
        </Card>
      ) : (
        rows.map((row) => (
          <Card key={row.id}>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <CardTitle>{row.roleName}</CardTitle>
                  <CardDescription>
                    {row.event?.title || 'Event'}
                    {row.ministry?.name ? ` · ${row.ministry.name}` : ''}
                    {row.team?.name ? ` · ${row.team.name}` : ''}
                  </CardDescription>
                </div>
                <Badge variant="secondary">{row.statusLabel}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>
                {new Date(row.scheduledAt).toLocaleString()}
                {row.endsAt ? ` – ${new Date(row.endsAt).toLocaleString()}` : ''}
              </p>
              {(row.status === 'proposed' || row.status === 'assigned') && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={saving}
                    onClick={() => void confirm(row.id)}
                  >
                    Confirm
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={saving}
                    onClick={() => setDeclineId(row.id)}
                  >
                    Decline
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={saving}
                    onClick={() => void requestReplacement(row.id)}
                  >
                    Request replacement
                  </Button>
                </div>
              )}
              {(row.status === 'confirmed' || row.status === 'assigned') && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={saving}
                    onClick={() => void checkIn(row.id)}
                  >
                    Check in
                  </Button>
                </div>
              )}
              {declineId === row.id ? (
                <div className="space-y-2 rounded-md border p-3">
                  <Label htmlFor={`decline-${row.id}`}>Reason (optional)</Label>
                  <Textarea
                    id={`decline-${row.id}`}
                    value={declineReason}
                    onChange={(event) => setDeclineReason(event.target.value)}
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      disabled={saving}
                      onClick={() => void decline(row.id)}
                    >
                      Confirm decline
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setDeclineId(null);
                        setDeclineReason('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
