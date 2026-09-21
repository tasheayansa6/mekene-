'use client';

import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api/client';

interface FamilyPayload {
  household: {
    id: string;
    familyReference: string | null;
    name: string;
    addressNote: string | null;
  } | null;
  members: Array<{
    id: string;
    name: string;
    membershipNumber: string | null;
    status: string;
    relationship: string;
    isPrimaryContact: boolean;
    isSelf: boolean;
  }>;
}

export default function MemberFamilyPage() {
  const [data, setData] = useState<FamilyPayload | null>(null);

  useEffect(() => {
    void apiGet<FamilyPayload>('/members/me/family').then((r) => setData(r.data));
  }, []);

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <h1 className="text-2xl font-semibold">My family</h1>
      {!data ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : !data.household ? (
        <p className="text-muted-foreground">You are not linked to a household yet.</p>
      ) : (
        <>
          <div className="rounded-md border p-4">
            <p className="font-medium">{data.household.name}</p>
            <p className="text-sm text-muted-foreground">
              {data.household.familyReference || 'No family reference yet'}
            </p>
            {data.household.addressNote ? (
              <p className="mt-2 text-sm">{data.household.addressNote}</p>
            ) : null}
          </div>
          <ul className="divide-y rounded-md border">
            {data.members.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                <span>
                  {m.name}
                  {m.isSelf ? ' (you)' : ''}
                </span>
                <span className="text-muted-foreground">
                  {m.relationship}
                  {m.isPrimaryContact ? ' · primary contact' : ''}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground">
            Need a family correction?{' '}
            <a className="underline" href="/member/profile">
              Submit a profile change request
            </a>
            .
          </p>
        </>
      )}
    </div>
  );
}
