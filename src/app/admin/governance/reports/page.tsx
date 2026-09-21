'use client';

import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api/client';
import { PageHeader } from '@/components/admin/PageHeader';
import { PermissionGate } from '@/components/admin/PermissionGate';
import { ApiErrorAlert } from '@/components/admin/ApiErrorAlert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface ReportsData {
  leadership: { active: number; ended: number };
  committees: { active: number; inactive: number };
  meetings: { scheduled: number; completed: number };
  decisions: { total: number; approved: number };
  resolutions: { total: number; approved: number };
  actionItems: { open: number; completed: number };
  policies: { published: number; inReview: number };
  requests: { open: number; completed: number };
}

export default function Page() {
  const [data, setData] = useState<ReportsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void apiGet<ReportsData>('/admin/governance/reports').then((result) => {
      if (!result.success || !result.data) {
        setError(result.message);
        return;
      }
      setData(result.data);
    });
  }, []);

  if (error) return <ApiErrorAlert message={error} />;
  if (!data) return <Skeleton className="h-72 w-full" />;

  const sections = [
    { title: 'Leadership', items: data.leadership },
    { title: 'Committees', items: data.committees },
    { title: 'Meetings', items: data.meetings },
    { title: 'Decisions', items: data.decisions },
    { title: 'Resolutions', items: data.resolutions },
    { title: 'Action items', items: data.actionItems },
    { title: 'Policies', items: data.policies },
    { title: 'Requests', items: data.requests },
  ];

  return (
    <PermissionGate permission="governance.view">
      <div className="space-y-6">
        <PageHeader
          title="Governance reports"
          description="Aggregated counts across administration and governance."
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {sections.map((section) => (
            <Card key={section.title}>
              <CardHeader>
                <CardTitle className="text-base">{section.title}</CardTitle>
                <CardDescription>
                  {Object.entries(section.items)
                    .map(([key, value]) => `${key}: ${value}`)
                    .join(' · ')}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </PermissionGate>
  );
}
