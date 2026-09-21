'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
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

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const ref = searchParams.get('ref') || '';
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  const load = useCallback(() => {
    if (!ref) {
      setError('Missing contribution reference.');
      setChecking(false);
      return;
    }
    setChecking(true);
    void apiGet<StatusPayload>(`/giving/status/${encodeURIComponent(ref)}`).then((result) => {
      setChecking(false);
      if (!result.success || !result.data) {
        setError(result.message || 'Could not load contribution status.');
        return;
      }
      setStatus(result.data);
      if (!result.data.isConfirmed) {
        router.replace(`/give/pending?ref=${encodeURIComponent(ref)}`);
      }
    });
  }, [ref, router]);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 4000);
    return () => window.clearInterval(timer);
  }, [load]);

  return (
    <div className="page-transition">
      <PageHero
        title="Thank you"
        subtitle="Give"
        description="Confirmed gifts appear here after the payment provider verifies the transaction."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Give', href: '/give' },
          { label: 'Success' },
        ]}
      />
      <Section>
        <div className="mx-auto max-w-lg">
          <Card>
            <CardHeader>
              <CardTitle>
                {status?.isConfirmed ? 'Gift confirmed' : checking ? 'Checking…' : 'Awaiting confirmation'}
              </CardTitle>
              <CardDescription>
                Status is never taken from the browser alone — we verify with the payment
                system.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {error ? <p className="text-destructive">{error}</p> : null}
              {status?.isConfirmed ? (
                <>
                  <p>
                    Thank you for your {status.fund.toLowerCase()} of{' '}
                    <strong>
                      {status.currency} {status.amount}
                    </strong>
                    .
                  </p>
                  <p className="text-muted-foreground">Reference: {status.reference}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild>
                      <Link href={`/give/receipt/${status.reference}`}>View receipt</Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link href="/give">Back to give</Link>
                    </Button>
                  </div>
                </>
              ) : !error ? (
                <p className="text-muted-foreground">
                  If confirmation is still pending, you will be redirected to the pending
                  page.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </Section>
    </div>
  );
}

export default function GiveSuccessPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading…</div>}>
      <SuccessContent />
    </Suspense>
  );
}
