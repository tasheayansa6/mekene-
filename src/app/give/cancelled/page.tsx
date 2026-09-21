'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
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

function CancelledContent() {
  const searchParams = useSearchParams();
  const ref = searchParams.get('ref');

  return (
    <div className="page-transition">
      <PageHero
        title="Checkout cancelled"
        subtitle="Give"
        description="No payment was completed. You can try again whenever you are ready."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Give', href: '/give' },
          { label: 'Cancelled' },
        ]}
      />
      <Section>
        <div className="mx-auto max-w-lg">
          <Card>
            <CardHeader>
              <CardTitle>Gift not completed</CardTitle>
              <CardDescription>
                Your contribution was cancelled at checkout. Nothing has been charged.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {ref ? (
                <p className="text-sm text-muted-foreground">Reference: {ref}</p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button asChild>
                  <Link href="/give/now">Try again</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/give">Giving hub</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Section>
    </div>
  );
}

export default function GiveCancelledPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading…</div>}>
      <CancelledContent />
    </Suspense>
  );
}
