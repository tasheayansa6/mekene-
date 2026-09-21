'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface DashboardPayload {
  profileCompletion: { percent: number; missing: string[] };
}

const steps = [
  { href: '/member/profile', title: 'Profile & photo' },
  { href: '/member/profile', title: 'Privacy / directory' },
  { href: '/member/settings/notifications', title: 'Notifications' },
  { href: '/member/profile', title: 'Preferred language' },
  { href: '/member/ministries', title: 'Ministry interests' },
  { href: '/member/services', title: 'Church information' },
];

export default function MemberOnboardingPage() {
  const [percent, setPercent] = useState<number | null>(null);
  const [missing, setMissing] = useState<string[]>([]);

  useEffect(() => {
    void apiGet<DashboardPayload>('/member/dashboard').then((result) => {
      setPercent(result.data?.profileCompletion.percent ?? 0);
      setMissing(result.data?.profileCompletion.missing || []);
    });
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-primary">Get started</h1>
        <p className="text-sm text-muted-foreground">Optional setup. You can skip any step.</p>
      </div>
      {percent !== null ? (
        <div className="space-y-2">
          <Progress value={percent} aria-label="Profile completion" />
          <p className="text-sm text-muted-foreground">
            {percent}% complete{missing.length ? ` · still needed: ${missing.join(', ')}` : ''}
          </p>
        </div>
      ) : null}
      <ol className="space-y-2">
        {steps.map((step, index) => (
          <li key={`${step.href}-${index}`}>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href={step.href}>
                {index + 1}. {step.title}
              </Link>
            </Button>
          </li>
        ))}
      </ol>
    </div>
  );
}
