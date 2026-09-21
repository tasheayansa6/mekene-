'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { apiGet, apiPost } from '@/lib/api/client';
import { PageHeader } from '@/components/admin/PageHeader';
import { PermissionGate } from '@/components/admin/PermissionGate';
import { ApiErrorAlert } from '@/components/admin/ApiErrorAlert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { publicErrorMessage } from '@/lib/admin/http-error';

interface ProfileChangeRow {
  id: string;
  memberId: string;
  status: string;
  fields: Record<string, unknown>;
  createdAt: string;
  requestedBy: { id: string; name: string | null } | null;
}

export default function ProfileChangesPage() {
  const [rows, setRows] = useState<ProfileChangeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    void apiGet<ProfileChangeRow[]>('/admin/members/profile-changes', {
      status: 'pending',
      pageSize: '50',
    }).then((result) => {
      setRows(result.data || []);
      setError(result.success ? null : result.message);
      setLoading(false);
    });
  }

  useEffect(() => {
    load();
  }, []);

  async function review(id: string, action: 'approve' | 'reject') {
    const result = await apiPost(`/admin/members/profile-changes/${id}/${action}`, {});
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    toast.success('Updated');
    load();
  }

  return (
    <PermissionGate permission="members.moderate">
      <div className="space-y-6">
        <PageHeader
          title="Profile change requests"
          description="Review protected field updates submitted by members."
          actions={
            <Button asChild variant="outline">
              <Link href="/admin/members">All members</Link>
            </Button>
          }
        />
        {error ? <ApiErrorAlert message={error} /> : null}
        {loading ? <Skeleton className="h-48 w-full" /> : null}
        {!loading && rows.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No pending requests</CardTitle>
              <CardDescription>New protected field change requests will appear here.</CardDescription>
            </CardHeader>
          </Card>
        ) : null}
        <div className="space-y-4">
          {rows.map((row) => (
            <Card key={row.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-base">
                    {row.requestedBy?.name || 'Member'} request
                  </CardTitle>
                  <Badge variant="secondary">{row.status}</Badge>
                </div>
                <CardDescription>
                  Submitted {new Date(row.createdAt).toLocaleString()} ·{' '}
                  <Link className="underline" href={`/admin/members/${row.memberId}`}>
                    Open member
                  </Link>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-1 text-sm">
                  {Object.entries(row.fields).map(([key, value]) => (
                    <li key={key}>
                      <span className="font-medium">{key}</span>: {String(value ?? '—')}
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" onClick={() => void review(row.id, 'approve')}>
                    Approve
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void review(row.id, 'reject')}
                  >
                    Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </PermissionGate>
  );
}
