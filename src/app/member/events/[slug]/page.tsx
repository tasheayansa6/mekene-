'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiErrorAlert } from '@/components/admin/ApiErrorAlert';

interface EventPayload {
  event: {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    startAt: string;
    endAt: string;
    timezone: string;
    locationName?: string | null;
    location?: { name: string | null } | null;
    organizerName?: string | null;
    isOnline?: boolean;
    registrationEnabled?: boolean;
  };
}

interface RegistrationRow {
  id: string;
  reference: string;
  status: string;
  event: { slug: string };
}

export default function MemberEventDetailPage() {
  const params = useParams<{ slug: string }>();
  const [data, setData] = useState<EventPayload | null>(null);
  const [registration, setRegistration] = useState<RegistrationRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!params.slug) return;
    void apiGet<EventPayload>(`/events/${params.slug}`).then((result) => {
      setData(result.data);
      setError(result.success ? null : result.message);
    });
    void apiGet<RegistrationRow[]>('/events/registrations', { pageSize: '50' }).then((result) => {
      const match = (result.data || []).find((row) => row.event.slug === params.slug && row.status !== 'cancelled');
      setRegistration(match || null);
    });
  }, [params.slug]);

  async function register() {
    if (!params.slug) return;
    setPending(true);
    const result = await apiPost(`/events/${params.slug}/register`, {});
    setPending(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    window.location.reload();
  }

  async function cancel() {
    if (!params.slug) return;
    setPending(true);
    const result = await apiPost(`/events/${params.slug}/cancel-registration`, {});
    setPending(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    window.location.reload();
  }

  if (!data && !error) return <Skeleton className="h-64 w-full" />;
  if (error || !data) return <ApiErrorAlert message={error || 'Event not found.'} />;

  const event = data.event;

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost">
        <Link href="/member/events">Back to my events</Link>
      </Button>
      <div>
        <h1 className="text-2xl font-semibold text-primary">{event.title}</h1>
        <p className="text-sm text-muted-foreground">
          {new Date(event.startAt).toLocaleString()} – {new Date(event.endAt).toLocaleString()}
          {event.timezone ? ` · ${event.timezone}` : ''}
        </p>
        <p className="text-sm text-muted-foreground">
          {event.location?.name || event.locationName || (event.isOnline ? 'Online' : 'Location TBA')}
        </p>
      </div>
      {event.description ? <p className="whitespace-pre-wrap text-sm leading-relaxed">{event.description}</p> : null}
      {registration ? (
        <div className="rounded-md border p-4 text-sm">
          <p>You are registered. Reference: {registration.reference}</p>
          <div className="mt-3 flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/member/events/registrations/${registration.id}`}>View registration</Link>
            </Button>
            <Button variant="outline" size="sm" disabled={pending} onClick={() => void cancel()}>
              Cancel registration
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href={`/api/v1/events/${event.slug}/ics`}>Add to calendar</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button disabled={pending} onClick={() => void register()}>
            Register
          </Button>
          <Button asChild variant="outline">
            <Link href={`/events/${event.slug}`}>Public event page</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
