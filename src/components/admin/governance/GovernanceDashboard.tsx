'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api/client';
import { PageHeader } from '@/components/admin/PageHeader';
import { PermissionGate } from '@/components/admin/PermissionGate';
import { ApiErrorAlert } from '@/components/admin/ApiErrorAlert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface OverviewData {
  counts: {
    leadershipActive: number;
    committees: number;
    upcomingMeetings: number;
    openActionItems: number;
    pendingRequests: number;
    policiesAwaitingApproval: number;
  };
  recentDecisions: Array<{
    id: string;
    title: string;
    status: string;
    decisionDate: string;
    committeeId: string | null;
  }>;
}

export function GovernanceDashboard() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void apiGet<OverviewData>('/admin/governance/overview').then((result) => {
      if (!result.success || !result.data) {
        setError(result.message);
        return;
      }
      setData(result.data);
    });
  }, []);

  if (error) return <ApiErrorAlert message={error} />;
  if (!data) return <Skeleton className="h-72 w-full" />;

  const cards = [
    { label: 'Active leadership', value: data.counts.leadershipActive, href: '/admin/governance/leadership/history' },
    { label: 'Committees', value: data.counts.committees, href: '/admin/governance' },
    { label: 'Upcoming meetings', value: data.counts.upcomingMeetings, href: '/admin/governance' },
    { label: 'Open action items', value: data.counts.openActionItems, href: '/admin/governance' },
    { label: 'Pending requests', value: data.counts.pendingRequests, href: '/admin/governance' },
    { label: 'Policies awaiting approval', value: data.counts.policiesAwaitingApproval, href: '/admin/governance' },
  ];

  return (
    <PermissionGate permission="governance.view">
      <div className="space-y-6">
        <PageHeader
          title="Governance"
          description="Church administration, committees, meetings, and policy oversight."
          actions={
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link href="/admin/governance/leadership/history">Leadership history</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/admin/governance/reports">Reports</Link>
              </Button>
            </div>
          }
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => (
            <Link key={card.label} href={card.href} className="block">
              <Card className="h-full transition-colors hover:bg-muted/40">
                <CardHeader>
                  <CardDescription>{card.label}</CardDescription>
                  <CardTitle className="text-3xl">{card.value}</CardTitle>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent decisions</CardTitle>
            <CardDescription>Latest governance decisions across committees.</CardDescription>
          </CardHeader>
          <CardContent>
            {data.recentDecisions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No decisions recorded yet.</p>
            ) : (
              <ul className="divide-y">
                {data.recentDecisions.map((decision) => (
                  <li key={decision.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                    <div>
                      <p className="font-medium">{decision.title}</p>
                      <p className="text-muted-foreground">
                        {new Date(decision.decisionDate).toLocaleDateString()} · {decision.status}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Quick links</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              <Link className="hover:underline" href="/admin/governance/leadership/history">
                Leadership appointment history
              </Link>
              <Link className="hover:underline" href="/admin/governance/reports">
                Governance reports
              </Link>
              <Link className="hover:underline" href="/leadership">
                Leadership portal
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </PermissionGate>
  );
}
