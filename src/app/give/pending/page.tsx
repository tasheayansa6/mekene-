'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { apiGet } from '@/lib/api/client';
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

interface StatusPayload {
  reference: string;
  status: string;
  amount: string;
  currency: string;
  receiptNumber: string | null;
  fund: string;
  isConfirmed: boolean;
}

function PendingContent() {
  const searchParams = useSearchParams();
  const ref = searchParams.get('ref') || '';
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!ref) return;
    setLoading(true);
    const result = await apiGet<StatusPayload>(`/giving/status/${encodeURIComponent(ref)}`);
    setLoading(false);
    if (!result.success || !result.data) {
      toast.error(result.message || 'Could not refresh status.');
      return;
    }
    setStatus(result.data);
    if (result.data.isConfirmed) {
      window.location.href = `/give/success?ref=${encodeURIComponent(ref)}`;
    }
  }, [ref]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="page-transition">
      <PageHero
        title="Payment processing"
        subtitle="Give"
        description="Your gift is being processed. Confirmed status comes from the payment provider, not the browser alone."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Give', href: '/give' },
          { label: 'Pending' },
        ]}
      />
      <Section>
        <div className="mx-auto max-w-lg">
          <Card>
            <CardHeader>
              <CardTitle>Almost there</CardTitle>
              <CardDescription>
                Bank transfers and some online checkouts take a short time to confirm.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {!ref ? (
                <p className="text-destructive">Missing contribution reference.</p>
              ) : (
                <>
                  <p>
                    Reference: <strong>{ref}</strong>
                  </p>
                  {status ? (
                    <p>
                      Status: {status.status}
                      {status.amount
                        ? ` · ${status.currency} ${status.amount} · ${status.fund}`
                        : ''}
                    </p>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => void load()} disabled={loading}>
                      {loading ? 'Refreshing…' : 'Refresh status'}
                    </Button>
                    <Button asChild variant="outline">
                      <Link href="/give">Giving hub</Link>
                    </Button>
                    {status?.isConfirmed ? (
                      <Button asChild variant="secondary">
                        <Link href={`/give/receipt/${ref}`}>Receipt</Link>
                      </Button>
                    ) : null}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </Section>
    </div>
  );
}

export default function GivePendingPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading…</div>}>
      <PendingContent />
    </Suspense>
  );
}
