'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { apiGet, apiPost } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

interface SessionRow {
  id: string;
  createdAt: string;
  ipAddress: string | null;
  userAgent: string | null;
  current: boolean;
}

export default function MemberSecurityPage() {
  const [sessions, setSessions] = useState<SessionRow[] | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pending, setPending] = useState(false);

  async function loadSessions() {
    const result = await apiGet<{ sessions: SessionRow[] }>('/auth/me/sessions');
    setSessions(result.data?.sessions || []);
  }

  useEffect(() => {
    void loadSessions();
  }, []);

  async function changePassword() {
    setPending(true);
    const result = await apiPost('/auth/me/password', { currentPassword, newPassword });
    setPending(false);
    if (!result.success) {
      toast.error(result.message || 'Unable to update password.');
      return;
    }
    toast.success(result.message);
    setCurrentPassword('');
    setNewPassword('');
    await loadSessions();
  }

  async function revokeOthers() {
    const result = await apiPost('/auth/me/sessions/revoke-others');
    if (!result.success) {
      toast.error(result.message);
      return;
    }
    toast.success(result.message);
    await loadSessions();
  }

  async function requestDeletion() {
    const result = await apiPost('/member/account/delete-request');
    if (!result.success) {
      toast.error(result.message);
      return;
    }
    toast.success(result.message);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-primary">Security</h1>
        <p className="text-sm text-muted-foreground">Password, sessions, and account requests.</p>
      </div>

      <form
        className="max-w-md space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          void changePassword();
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="current-password">Current password</Label>
          <Input
            id="current-password"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="new-password">New password</Label>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
        </div>
        <Button type="submit" disabled={pending}>
          Update password
        </Button>
      </form>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Sessions</h2>
        {sessions === null ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <ul className="space-y-2 text-sm">
            {sessions.map((row) => (
              <li key={row.id} className="rounded-md border p-3">
                {row.current ? 'This device' : 'Other device'} · {new Date(row.createdAt).toLocaleString()}
                {row.ipAddress ? ` · ${row.ipAddress}` : ''}
              </li>
            ))}
          </ul>
        )}
        <Button variant="outline" onClick={() => void revokeOthers()}>
          Sign out other sessions
        </Button>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Account deletion</h2>
        <p className="text-sm text-muted-foreground">
          Requests are reviewed by the church office. Your account is not deleted immediately.
        </p>
        <Button variant="outline" onClick={() => void requestDeletion()}>
          Request account deletion
        </Button>
      </section>
    </div>
  );
}
