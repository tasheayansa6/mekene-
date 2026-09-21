'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';

import { apiPost, ensureCsrfToken } from '@/lib/api/client';
import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ApiErrorAlert } from '@/components/admin/ApiErrorAlert';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export interface RegisterEventSummary {
  title: string;
  slug: string;
  registrationRequired: boolean;
  allowGuestRegistration: boolean;
  capacity: number | null;
  registrationDeadline: string | null;
  timezone: string;
  status: string;
}

interface ConfirmResult {
  registration: {
    id: string;
    reference: string;
    status: string;
    waitlistPosition: number | null;
  };
}

export function EventRegisterForm({ event }: { event: RegisterEventSummary }) {
  const { user, status: authStatus } = useAuth();
  const signedIn = authStatus === 'authenticated' && Boolean(user);
  const guestAllowed = event.allowGuestRegistration;

  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestPartySize, setGuestPartySize] = useState('1');
  const [notes, setNotes] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<ConfirmResult | null>(null);

  if (!event.registrationRequired) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Registration not required</CardTitle>
          <CardDescription>You can attend this event without registering.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link href={`/events/${event.slug}`}>Back to event</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (event.status === 'cancelled') {
    return (
      <Alert variant="destructive">
        <AlertTitle>Event cancelled</AlertTitle>
        <AlertDescription>Registration is closed for this cancelled event.</AlertDescription>
      </Alert>
    );
  }

  if (!signedIn && !guestAllowed) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sign in to register</CardTitle>
          <CardDescription>
            This event requires a church account. Guests cannot register.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href={`/login?next=${encodeURIComponent(`/events/${event.slug}/register`)}`}>
              Sign in
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/events/${event.slug}`}>Back to event</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (confirmed) {
    const waitlisted = confirmed.registration.status === 'waitlisted';
    return (
      <Card>
        <CardHeader>
          <CardTitle>{waitlisted ? 'Added to waitlist' : 'Registration confirmed'}</CardTitle>
          <CardDescription>
            Keep this reference for your records
            {signedIn ? ', or open it from My Events.' : '.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm">
            Reference:{' '}
            <span className="font-mono font-semibold">{confirmed.registration.reference}</span>
          </p>
          <p className="text-sm text-muted-foreground">Status: {confirmed.registration.status}</p>
          {waitlisted && confirmed.registration.waitlistPosition != null ? (
            <p className="text-sm text-muted-foreground">
              Waitlist position: {confirmed.registration.waitlistPosition}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-3">
            {signedIn ? (
              <Button asChild>
                <Link href={`/member/events/registrations/${confirmed.registration.id}`}>
                  View registration
                </Link>
              </Button>
            ) : null}
            <Button asChild variant="outline">
              <Link href={`/events/${event.slug}`}>Back to event</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    await ensureCsrfToken();

    const body: Record<string, unknown> = {
      notes: notes.trim() || undefined,
    };
    if (!signedIn) {
      body.guestName = guestName.trim();
      body.guestEmail = guestEmail.trim();
      body.guestPhone = guestPhone.trim() || undefined;
      body.guestPartySize = Number(guestPartySize) || 1;
    }

    const result = await apiPost<ConfirmResult>(`/events/${event.slug}/register`, body);
    setPending(false);

    if (!result.success || !result.data) {
      setError(result.message || 'Unable to register.');
      toast.error(result.message || 'Unable to register.');
      return;
    }

    setConfirmed(result.data);
    toast.success(result.message || 'Registration confirmed.');
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Register for {event.title}</CardTitle>
        <CardDescription>
          {signedIn
            ? `Registering as ${user?.firstName} ${user?.lastName}`.trim()
            : 'Guest registration. Provide your contact details below.'}
          {event.capacity ? ` Capacity: ${event.capacity}.` : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="mb-4">
            <ApiErrorAlert message={error} />
          </div>
        ) : null}
        <form className="space-y-4" onSubmit={onSubmit} noValidate>
          {!signedIn ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="guestName">Full name</Label>
                <Input
                  id="guestName"
                  name="guestName"
                  autoComplete="name"
                  required
                  value={guestName}
                  onChange={(ev) => setGuestName(ev.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="guestEmail">Email</Label>
                <Input
                  id="guestEmail"
                  name="guestEmail"
                  type="email"
                  autoComplete="email"
                  required
                  value={guestEmail}
                  onChange={(ev) => setGuestEmail(ev.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="guestPhone">Phone (optional)</Label>
                <Input
                  id="guestPhone"
                  name="guestPhone"
                  type="tel"
                  autoComplete="tel"
                  value={guestPhone}
                  onChange={(ev) => setGuestPhone(ev.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="guestPartySize">Party size</Label>
                <Input
                  id="guestPartySize"
                  name="guestPartySize"
                  type="number"
                  min={1}
                  max={20}
                  required
                  value={guestPartySize}
                  onChange={(ev) => setGuestPartySize(ev.target.value)}
                />
              </div>
            </>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={3}
              maxLength={500}
              value={notes}
              onChange={(ev) => setNotes(ev.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={pending}>
              {pending ? 'Submitting…' : 'Submit registration'}
            </Button>
            <Button asChild type="button" variant="outline">
              <Link href={`/events/${event.slug}`}>Cancel</Link>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
