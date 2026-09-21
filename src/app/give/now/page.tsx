'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { GiveForm } from '@/components/giving/GiveForm';

function GiveNowContent() {
  const searchParams = useSearchParams();
  return (
    <GiveForm
      initialCategory={searchParams.get('fund') || searchParams.get('category') || undefined}
      initialCampaign={searchParams.get('campaign') || undefined}
      initialMinistry={searchParams.get('ministry') || undefined}
      initialEvent={searchParams.get('event') || undefined}
      initialAmount={searchParams.get('amount') || undefined}
      initialCurrency={searchParams.get('currency') || undefined}
    />
  );
}

export default function GiveNowPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading…</div>}>
      <GiveNowContent />
    </Suspense>
  );
}
