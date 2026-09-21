'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { apiGet, apiPost } from '@/lib/api/client';
import { Button } from '@/components/ui/button';

export default function MemberCardPage() {
  const [info, setInfo] = useState<{
    membershipNumber: string | null;
    status: string;
    hasActiveCard: boolean;
  } | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    void apiGet<{
      membershipNumber: string | null;
      status: string;
      hasActiveCard: boolean;
    }>('/members/me/card').then((r) => setInfo(r.data));
  }, []);

  async function issue() {
    const result = await apiPost<{ token: string; display: { name: string; membershipNumber: string | null } }>(
      '/members/me/card'
    );
    if (!result.success || !result.data) {
      toast.error(result.message || 'Unable to issue card.');
      return;
    }
    setToken(result.data.token);
    toast.success('Card issued. Present the token to staff for check-in.');
  }

  return (
    <div className="mx-auto max-w-md space-y-6 p-4">
      <h1 className="text-2xl font-semibold">Member card</h1>
      {info ? (
        <div className="rounded-xl border p-6 text-center">
          <p className="text-sm text-muted-foreground">Busa Mekene Eyasus Church</p>
          <p className="mt-4 text-xl font-medium">{info.membershipNumber || '—'}</p>
          <p className="text-sm capitalize text-muted-foreground">{info.status}</p>
          {token ? (
            <p className="mt-4 break-all rounded bg-muted p-3 font-mono text-xs">{token}</p>
          ) : null}
          <Button className="mt-6" onClick={() => void issue()}>
            {info.hasActiveCard ? 'Reissue card' : 'Create card'}
          </Button>
        </div>
      ) : (
        <p className="text-muted-foreground">Loading…</p>
      )}
    </div>
  );
}
