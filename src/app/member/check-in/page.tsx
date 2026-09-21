'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { apiGet, apiPost } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiErrorAlert } from '@/components/admin/ApiErrorAlert';
import { publicErrorMessage } from '@/lib/admin/http-error';

interface ActiveSession {
  id: string;
  title: string;
  sessionTypeLabel: string;
  startsAt: string;
  endsAt: string | null;
  locationNote: string | null;
  location: { id: string; name: string } | null;
  alreadyCheckedIn: boolean;
}

export default function MemberCheckInPage() {
  const [sessions, setSessions] = useState<ActiveSession[] | null>(null);
  const [hasMembership, setHasMembership] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  function load() {
    void apiGet<{ sessions: ActiveSession[]; hasMembership: boolean }>(
      '/attendance/sessions/active'
    ).then((result) => {
      if (!result.success) {
        setError(result.message);
        setSessions([]);
        return;
      }
      setSessions(result.data?.sessions || []);
      setHasMembership(result.data?.hasMembership !== false);
      setError(null);
    });
  }

  useEffect(() => {
    load();
  }, []);

  async function checkIn(sessionId: string) {
    setPendingId(sessionId);
    const result = await apiPost('/attendance/check-in', { sessionId });
    setPendingId(null);
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    toast.success(result.message || 'You are checked in.');
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-primary">Check in</h1>
        <p className="text-sm text-muted-foreground">
          Check in only when a session is open. Closed sessions are not listed.
        </p>
      </div>

      {error ? <ApiErrorAlert message={error} /> : null}

      {!hasMembership ? (
        <Card>
          <CardHeader>
            <CardTitle>Membership required</CardTitle>
            <CardDescription>
              A website account is not church membership.{' '}
              <Link className="underline" href="/membership/apply">
                Apply for membership
              </Link>{' '}
              before checking in.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : sessions === null ? (
        <Skeleton className="h-40 w-full" />
      ) : sessions.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No attendance sessions are currently open.</CardTitle>
            <CardDescription>
              When church staff open a service or event for check-in, it will appear here.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4">
          {sessions.map((session) => (
            <Card key={session.id}>
              <CardHeader>
                <CardTitle>{session.title}</CardTitle>
                <CardDescription>
                  {session.sessionTypeLabel} ·{' '}
                  {new Date(session.startsAt).toLocaleString()}
                  {session.location?.name || session.locationNote
                    ? ` · ${session.location?.name || session.locationNote}`
                    : ''}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {session.alreadyCheckedIn ? (
                  <p className="text-sm font-medium text-primary">You are checked in.</p>
                ) : (
                  <Button
                    onClick={() => void checkIn(session.id)}
                    disabled={pendingId === session.id}
                  >
                    {pendingId === session.id ? 'Checking in…' : 'Check in'}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
