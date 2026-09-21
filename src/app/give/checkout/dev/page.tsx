'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { apiPost } from '@/lib/api/client';
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

function DevCheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const ref = searchParams.get('ref') || '';
  const [pending, setPending] = useState<string | null>(null);

  async function simulate(outcome: 'successful' | 'failed' | 'cancelled') {
    if (!ref) {
      toast.error('Missing contribution reference.');
      return;
    }
    setPending(outcome);
    const result = await apiPost<{ reference?: string; status?: string }>(
      '/giving/dev-checkout',
      { reference: ref, outcome }
    );
    setPending(null);
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    toast.success(result.message || `Simulated ${outcome}.`);
    if (outcome === 'successful') {
      router.push(`/give/success?ref=${encodeURIComponent(ref)}`);
      return;
    }
    if (outcome === 'cancelled') {
      router.push(`/give/cancelled?ref=${encodeURIComponent(ref)}`);
      return;
    }
    router.push(`/give/pending?ref=${encodeURIComponent(ref)}`);
  }

  return (
    <div className="page-transition">
      <PageHero
        title="Development checkout"
        subtitle="Signed_dev simulator"
        description="This page only simulates signed_dev provider outcomes. It is not a real card form and must not be used as production merchant checkout."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Give', href: '/give' },
          { label: 'Dev checkout' },
        ]}
      />
      <Section>
        <div className="mx-auto max-w-lg">
          <Card>
            <CardHeader>
              <CardTitle>Simulate payment outcome</CardTitle>
              <CardDescription>
                Calls POST /giving/dev-checkout, then navigates to success, cancelled, or
                pending. No card fields are collected.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Reference: {ref || '—'}
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Button
                  onClick={() => void simulate('successful')}
                  disabled={!ref || pending !== null}
                >
                  {pending === 'successful' ? 'Working…' : 'Mark successful'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => void simulate('failed')}
                  disabled={!ref || pending !== null}
                >
                  {pending === 'failed' ? 'Working…' : 'Mark failed'}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => void simulate('cancelled')}
                  disabled={!ref || pending !== null}
                >
                  {pending === 'cancelled' ? 'Working…' : 'Mark cancelled'}
                </Button>
              </div>
              <Button asChild variant="ghost">
                <Link href="/give">Cancel and return</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </Section>
    </div>
  );
}

export default function DevCheckoutPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading…</div>}>
      <DevCheckoutContent />
    </Suspense>
  );
}
