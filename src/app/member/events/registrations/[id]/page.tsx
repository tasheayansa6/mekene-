'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';

import { apiGet, apiPost, ensureCsrfToken } from '@/lib/api/client';
import { Badge } from '@/components/ui/badge';
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
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';

interface Detail {
  registration: {
    id: string;
    reference: string;
    status: string;
    registeredAt: string;
    cancelledAt: string | null;
    waitlistPosition: number | null;
    event: {
      id: string;
      title: string;
      slug: string;
      startAt: string;
      endAt: string;
      timezone: string;
      status: string;
      locationName: string | null;
      locationAddress: string | null;
      meetingUrl: string | null;
    };
    capacity: {
      capacity: number | null;
      registered: number;
      waitlisted: number;
      available: number | null;
      isFull: boolean;
    };
  };
}

const CANCELLABLE = new Set(['registered', 'waitlisted', 'confirmed']);

export default function MemberRegistrationDetailPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<Detail['registration'] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [pending, setPending] = useState(false);

  function load() {
    if (!params.id) return;
    setLoading(true);
    void apiGet<Detail>(`/events/registrations/${params.id}`).then((result) => {
      setData(result.data?.registration ?? null);
      setError(result.success ? null : result.message);
      setLoading(false);
    });
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function cancelRegistration() {
    if (!data) return;
    setPending(true);
    await ensureCsrfToken();
    const result = await apiPost(`/events/${data.event.slug}/cancel-registration`);
    setPending(false);
    if (!result.success) {
      toast.error(result.message || 'Unable to cancel.');
      return;
    }
    toast.success(result.message || 'Registration cancelled.');
    setCancelOpen(false);
    load();
  }

  if (loading) return <Skeleton className="h-64 w-full" />;

  if (error || !data) {
    return (
      <div className="space-y-4">
        <ApiErrorAlert message={error || 'Registration not found.'} />
        <Button asChild variant="outline">
          <Link href="/member/events">Back to my events</Link>
        </Button>
      </div>
    );
  }

  const canCancel = CANCELLABLE.has(data.status);

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost">
        <Link href="/member/events">Back to my events</Link>
      </Button>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>{data.event.title}</CardTitle>
              <CardDescription>
                Reference <span className="font-mono">{data.reference}</span>
              </CardDescription>
            </div>
            <Badge variant={data.status === 'cancelled' ? 'destructive' : 'secondary'}>
              {data.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p>
            <span className="font-medium">When: </span>
            {new Date(data.event.startAt).toLocaleString(undefined, {
              dateStyle: 'full',
              timeStyle: 'short',
            })}
          </p>
          {data.event.locationName ? (
            <p>
              <span className="font-medium">Location: </span>
              {data.event.locationName}
              {data.event.locationAddress ? ` · ${data.event.locationAddress}` : ''}
            </p>
          ) : null}
          {data.event.meetingUrl ? (
            <p>
              <Button asChild size="sm">
                <a href={data.event.meetingUrl} rel="noreferrer">
                  Join meeting
                </a>
              </Button>
            </p>
          ) : null}
          {data.waitlistPosition != null ? (
            <p className="text-muted-foreground">Waitlist position: {data.waitlistPosition}</p>
          ) : null}
          <p className="text-muted-foreground">
            Registered {new Date(data.registeredAt).toLocaleString()}
            {data.cancelledAt
              ? ` · Cancelled ${new Date(data.cancelledAt).toLocaleString()}`
              : ''}
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button asChild variant="outline">
              <Link href={`/events/${data.event.slug}`}>Event details</Link>
            </Button>
            {canCancel ? (
              <Button variant="destructive" onClick={() => setCancelOpen(true)}>
                Cancel registration
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel this registration?"
        description="Your seat may be offered to someone on the waitlist. You can register again later if the event is still open."
        confirmLabel="Cancel registration"
        destructive
        loading={pending}
        onConfirm={cancelRegistration}
      />
    </div>
  );
}
