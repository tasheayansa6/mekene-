'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { apiGet, apiPost } from '@/lib/api/client';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { Section } from '@/components/layout/Section';
import { PageHero } from '@/components/sections/PageHero';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { publicErrorMessage } from '@/lib/admin/http-error';

interface ActiveSession {
  id: string;
  title: string;
  sessionTypeLabel: string;
  startsAt: string;
  locationNote: string | null;
  location: { name: string } | null;
  alreadyCheckedIn: boolean;
}

export default function PublicCheckInPage() {
  const [sessions, setSessions] = useState<ActiveSession[] | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  function load() {
    void apiGet<{ sessions: ActiveSession[] }>('/attendance/sessions/active').then((result) => {
      setSessions(result.data?.sessions || []);
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
    toast.success('You are checked in.');
    load();
  }

  return (
    <AuthGuard>
      <div className="page-transition">
        <PageHero
          title="Check in"
          subtitle="Attendance"
          description="Open attendance sessions for members. Individual attendance is never shown publicly."
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Check-in' },
          ]}
        />
        <Section>
          <div className="mx-auto max-w-2xl space-y-4">
            {sessions === null ? (
              <p className="text-sm text-muted-foreground">Loading open sessions…</p>
            ) : sessions.length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>No attendance sessions are currently open.</CardTitle>
                  <CardDescription>
                    Visit your{' '}
                    <Link className="underline" href="/member/check-in">
                      member check-in
                    </Link>{' '}
                    page later, or ask church staff when a session is open.
                  </CardDescription>
                </CardHeader>
              </Card>
            ) : (
              sessions.map((session) => (
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
                      <p className="text-sm font-medium">You are checked in.</p>
                    ) : (
                      <Button
                        onClick={() => void checkIn(session.id)}
                        disabled={pendingId === session.id}
                      >
                        Check in
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </Section>
      </div>
    </AuthGuard>
  );
}
