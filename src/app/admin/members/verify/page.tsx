'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { apiPost } from '@/lib/api/client';
import { PageHeader } from '@/components/admin/PageHeader';
import { PermissionGate } from '@/components/admin/PermissionGate';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { publicErrorMessage } from '@/lib/admin/http-error';

export default function VerifyMemberCardPage() {
  const [token, setToken] = useState('');
  const [result, setResult] = useState<{
    membershipNumber: string | null;
    name: string;
    status: string;
  } | null>(null);

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    const res = await apiPost<{
      membershipNumber: string | null;
      name: string;
      status: string;
    }>('/admin/members/verify', { token: token.trim() });
    if (!res.success || !res.data) {
      setResult(null);
      toast.error(publicErrorMessage(res.status, res.message));
      return;
    }
    setResult(res.data);
    toast.success('Card verified.');
  }

  return (
    <PermissionGate permission="members.view">
      <div className="mx-auto max-w-lg space-y-6">
        <PageHeader
          title="Verify member card"
          description="Enter or scan the secure card token. Private contact and financial data are never returned."
        />
        <form className="space-y-3 rounded-md border p-4" onSubmit={(e) => void verify(e)}>
          <div className="space-y-1">
            <Label htmlFor="card-token">Card token</Label>
            <Input
              id="card-token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              autoComplete="off"
            />
          </div>
          <Button type="submit">Verify</Button>
        </form>
        {result ? (
          <div className="rounded-md border p-4 text-sm">
            <p>
              <span className="text-muted-foreground">Name:</span> {result.name}
            </p>
            <p>
              <span className="text-muted-foreground">Member #:</span>{' '}
              {result.membershipNumber || '—'}
            </p>
            <p>
              <span className="text-muted-foreground">Status:</span> {result.status}
            </p>
          </div>
        ) : null}
      </div>
    </PermissionGate>
  );
}
