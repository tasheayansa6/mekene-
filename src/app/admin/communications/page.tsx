'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPost } from '@/lib/api/client';
import { PageHeader } from '@/components/admin/PageHeader';
import { PermissionGate } from '@/components/admin/PermissionGate';
import { ApiErrorAlert } from '@/components/admin/ApiErrorAlert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

interface Overview {
  metrics: {
    unreadInApp: number;
    jobsPending: number;
    jobsScheduled: number;
    deliveriesFailed7d: number;
    deliveriesSent7d: number;
    failed: number;
    pending: number;
  };
  recentJobs: Array<{
    id: string;
    type: string;
    status: string;
    audience: string;
    channels: string;
    priority: string;
    createdAt: string;
    lastError: string | null;
  }>;
  integrations: {
    telegram: { configured: boolean; displayName: string };
    sms: { configured: boolean; displayName: string };
    email: { configured: boolean; displayName: string };
  };
  templatesCount: number;
  openConversations: number;
}

export default function AdminCommunicationsPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processMsg, setProcessMsg] = useState<string | null>(null);

  useEffect(() => {
    void apiGet<Overview>('/admin/communications/overview').then((result) => {
      if (!result.success || !result.data) {
        setError(result.message);
        return;
      }
      setData(result.data);
    });
  }, []);

  async function processJobs() {
    setProcessMsg(null);
    const result = await apiPost<{ processed: number; scanned: number }>(
      '/admin/communications/jobs/process',
      {}
    );
    setProcessMsg(result.message || (result.success ? 'Processed.' : 'Failed.'));
    if (result.success) {
      const refreshed = await apiGet<Overview>('/admin/communications/overview');
      if (refreshed.success && refreshed.data) setData(refreshed.data);
    }
  }

  return (
    <PermissionGate permission="communications.view">
      <div className="space-y-6">
        <PageHeader
          title="Communications"
          description="Announcements, delivery jobs, templates, and staff inbox."
          actions={
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href="/admin/communications/send">Send notice</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/admin/communications/templates">Templates</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/admin/communications/reports">Reports</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/admin/messages">Messages</Link>
              </Button>
              <Button variant="secondary" onClick={() => void processJobs()}>
                Process queue
              </Button>
            </div>
          }
        />

        {error ? <ApiErrorAlert message={error} /> : null}
        {processMsg ? <p className="text-sm text-muted-foreground">{processMsg}</p> : null}

        {!data ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Card>
                <CardHeader>
                  <CardDescription>Unread in-app</CardDescription>
                  <CardTitle>{data.metrics.unreadInApp}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardDescription>Jobs pending</CardDescription>
                  <CardTitle>{data.metrics.jobsPending}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardDescription>Scheduled jobs</CardDescription>
                  <CardTitle>{data.metrics.jobsScheduled}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardDescription>Sent (7d)</CardDescription>
                  <CardTitle>{data.metrics.deliveriesSent7d}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardDescription>Failed (7d)</CardDescription>
                  <CardTitle>{data.metrics.deliveriesFailed7d}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardDescription>Active templates</CardDescription>
                  <CardTitle>{data.templatesCount}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardDescription>Open support threads</CardDescription>
                  <CardTitle>{data.openConversations}</CardTitle>
                </CardHeader>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Integrations</CardTitle>
                <CardDescription>Channel provider configuration status.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3 text-sm">
                <Badge variant={data.integrations.email.configured ? 'default' : 'outline'}>
                  Email {data.integrations.email.configured ? 'ready' : 'pending'}
                </Badge>
                <Badge variant={data.integrations.telegram.configured ? 'default' : 'outline'}>
                  Telegram {data.integrations.telegram.configured ? 'ready' : 'not configured'}
                </Badge>
                <Badge variant={data.integrations.sms.configured ? 'default' : 'outline'}>
                  SMS {data.integrations.sms.configured ? 'ready' : 'not configured'}
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent jobs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm" role="list" aria-label="Recent communication jobs">
                {data.recentJobs.length === 0 ? (
                  <p className="text-muted-foreground">No communication jobs yet.</p>
                ) : (
                  data.recentJobs.map((job) => (
                    <div
                      key={job.id}
                      role="listitem"
                      className="flex flex-wrap items-center justify-between gap-2 border-b py-2 last:border-0"
                    >
                      <div>
                        <Link href={`/admin/communications/${job.id}`} className="font-medium hover:underline">
                          {job.type}
                        </Link>
                        <p className="text-muted-foreground">
                          {job.audience} · {job.channels} · {job.priority}
                        </p>
                      </div>
                      <Badge variant="outline">{job.status}</Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </PermissionGate>
  );
}
