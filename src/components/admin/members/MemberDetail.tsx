'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { apiGet, apiPatch, apiPost, apiDelete } from '@/lib/api/client';
import { useAuth } from '@/components/providers/AuthProvider';
import { PageHeader } from '@/components/admin/PageHeader';
import { PermissionGate } from '@/components/admin/PermissionGate';
import { ApiErrorAlert } from '@/components/admin/ApiErrorAlert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { publicErrorMessage } from '@/lib/admin/http-error';
import Link from 'next/link';

interface MemberDetailData {
  id: string;
  displayName: string;
  membershipNumber: string | null;
  status: string;
  statusLabel: string;
  preferredLanguage: string;
  dateJoined: string | null;
  household: { id: string; name: string } | null;
  ministries: Array<{
    id: string;
    roleLabel: string | null;
    status: string;
    ministry: { id: string; name: string; slug: string };
  }>;
  applications: Array<{ id: string; status: string; statusLabel: string; submittedAt: string }>;
  history: Array<{
    id: string;
    oldStatus: string | null;
    newStatus: string;
    reason: string | null;
    createdAt: string;
    changedBy: { id: string; name: string } | null;
  }>;
  account: {
    id: string;
    email?: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    role: { slug: string; name: string } | null;
  } | null;
}

export function MemberDetail({ id }: { id: string }) {
  const { can } = useAuth();
  const [row, setRow] = useState<MemberDetailData | null>(null);
  const [options, setOptions] = useState<{
    households: Array<{ id: string; name: string }>;
    ministries: Array<{ id: string; name: string; slug: string }>;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('active');
  const [householdId, setHouseholdId] = useState('none');
  const [ministryId, setMinistryId] = useState('');
  const [roleLabel, setRoleLabel] = useState('');

  function load() {
    void Promise.all([
      apiGet<{ member: MemberDetailData }>(`/admin/members/${id}`),
      apiGet<{
        households: Array<{ id: string; name: string }>;
        ministries: Array<{ id: string; name: string; slug: string }>;
      }>('/admin/members/options'),
    ]).then(([detail, opts]) => {
      if (!detail.success || !detail.data?.member) {
        setError(detail.message);
        return;
      }
      setRow(detail.data.member);
      setStatus(detail.data.member.status);
      setHouseholdId(detail.data.member.household?.id || 'none');
      setOptions(opts.data || null);
    });
  }

  useEffect(() => {
    load();
  }, [id]);

  async function save() {
    const result = await apiPatch(`/admin/members/${id}`, {
      status,
      householdId: householdId === 'none' ? null : householdId,
    });
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    toast.success('Member updated.');
    load();
  }

  async function addMinistry() {
    if (!ministryId) return;
    const result = await apiPost(`/admin/members/${id}/ministries`, {
      ministryId,
      roleLabel: roleLabel || undefined,
      status: 'active',
    });
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    toast.success('Ministry participation updated.');
    setRoleLabel('');
    load();
  }

  async function removeMinistry(ministryKey: string) {
    const result = await apiDelete(`/admin/members/${id}/ministries/${ministryKey}`);
    if (!result.success) {
      toast.error(result.message || 'Unable to remove participation.');
      return;
    }
    load();
  }

  if (error) return <ApiErrorAlert message={error} />;
  if (!row) return <Skeleton className="h-72 w-full" />;

  return (
    <PermissionGate permission="members.view">
      <div className="space-y-6">
        <PageHeader
          title={row.displayName}
          description={row.membershipNumber || 'No membership number yet'}
          actions={
            can('pastoral.view') ? (
              <Button asChild variant="outline">
                <Link href={`/admin/members/${id}/care`}>Pastoral care</Link>
              </Button>
            ) : null
          }
        />
        <Badge>{row.statusLabel}</Badge>

        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Account details come from the existing user record. Passwords are never shown.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              {row.account?.firstName} {row.account?.lastName}
            </p>
            <p>{row.account?.email}</p>
            <p>Phone: {row.account?.phone || '—'}</p>
            <p>Website role: {row.account?.role?.name || '—'}</p>
            <p>Preferred language: {row.preferredLanguage}</p>
            <p>Joined: {row.dateJoined ? new Date(row.dateJoined).toLocaleDateString() : '—'}</p>
          </CardContent>
        </Card>

        {can('members.update') ? (
          <Card>
            <CardHeader>
              <CardTitle>Membership</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="transferred">Transferred</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Household</Label>
                <Select value={householdId} onValueChange={setHouseholdId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {(options?.households || []).map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => void save()}>Save membership</Button>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Ministries</CardTitle>
            <CardDescription>Participation does not grant ministry leadership permissions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {row.ministries.length === 0 ? <p className="text-sm text-muted-foreground">None recorded.</p> : null}
            <ul className="space-y-2 text-sm">
              {row.ministries.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-2">
                  <span>
                    {item.ministry.name}
                    {item.roleLabel ? ` · ${item.roleLabel}` : ''} · {item.status}
                  </span>
                  {can('members.update') ? (
                    <Button size="sm" variant="ghost" onClick={() => void removeMinistry(item.ministry.id)}>
                      Remove
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
            {can('members.update') ? (
              <div className="grid gap-2 sm:grid-cols-3">
                <Select value={ministryId} onValueChange={setMinistryId}>
                  <SelectTrigger aria-label="Ministry">
                    <SelectValue placeholder="Ministry" />
                  </SelectTrigger>
                  <SelectContent>
                    {(options?.ministries || []).map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Role label (optional)"
                  value={roleLabel}
                  onChange={(e) => setRoleLabel(e.target.value)}
                />
                <Button type="button" onClick={() => void addMinistry()}>
                  Add participation
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Application history</CardTitle>
          </CardHeader>
          <CardContent>
            {row.applications.length === 0 ? (
              <p className="text-sm text-muted-foreground">No applications on file.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {row.applications.map((item) => (
                  <li key={item.id}>
                    <Link className="underline" href={`/admin/members/applications/${item.id}`}>
                      {item.statusLabel}
                    </Link>{' '}
                    · {new Date(item.submittedAt).toLocaleDateString()}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status history</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2 text-sm">
              {row.history.map((item) => (
                <li key={item.id}>
                  {item.oldStatus || '—'} → {item.newStatus}
                  {item.changedBy ? ` · ${item.changedBy.name}` : ''} ·{' '}
                  {new Date(item.createdAt).toLocaleString()}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
    </PermissionGate>
  );
}
