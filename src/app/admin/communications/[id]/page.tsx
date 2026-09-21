'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiGet } from '@/lib/api/client';
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
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface JobDetail {
  job: {
    id: string;
    type: string;
    status: string;
    audience: string;
    channels: string[];
    priority: string;
    scheduledAt: string | null;
    processedAt: string | null;
    lastError: string | null;
    createdAt: string;
    payloadSummary: { title?: string; notificationType?: string };
  };
  deliveryAggregates: {
    byChannel: Record<string, number>;
    byStatus: Record<string, number>;
  };
}

export default function AdminCommunicationJobPage() {
  const params = useParams<{ id: string }>();
  const [tab, setTab] = useState<'overview' | 'delivery'>('overview');
  const [data, setData] = useState<JobDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.id) return;
    void apiGet<JobDetail>(`/admin/communications/jobs/${params.id}`).then((result) => {
      if (!result.success || !result.data) {
        setError(result.message);
        return;
      }
      setData(result.data);
    });
  }, [params.id]);

  return (
    <PermissionGate permission="communications.view">
      <div className="space-y-6">
        <PageHeader
          title="Communication job"
          description={data?.job.payloadSummary.title || 'Job detail and delivery aggregates.'}
          actions={
            <Button asChild variant="outline">
              <Link href="/admin/communications">Back</Link>
            </Button>
          }
        />

        {error ? <ApiErrorAlert message={error} /> : null}

        {!data ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <>
            <div className="flex gap-2">
              <Button
                variant={tab === 'overview' ? 'default' : 'outline'}
                onClick={() => setTab('overview')}
              >
                Overview
              </Button>
              <Button
                variant={tab === 'delivery' ? 'default' : 'outline'}
                onClick={() => setTab('delivery')}
              >
                Delivery
              </Button>
            </div>

            {tab === 'overview' ? (
              <Card>
                <CardHeader>
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle>{data.job.type}</CardTitle>
                    <Badge variant="outline">{data.job.status}</Badge>
                    <Badge variant="secondary">{data.job.priority}</Badge>
                  </div>
                  <CardDescription>
                    Created {new Date(data.job.createdAt).toLocaleString()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>
                    <span className="text-muted-foreground">Audience:</span> {data.job.audience}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Channels:</span>{' '}
                    {data.job.channels.join(', ')}
                  </p>
                  {data.job.scheduledAt ? (
                    <p>
                      <span className="text-muted-foreground">Scheduled:</span>{' '}
                      {new Date(data.job.scheduledAt).toLocaleString()}
                    </p>
                  ) : null}
                  {data.job.processedAt ? (
                    <p>
                      <span className="text-muted-foreground">Processed:</span>{' '}
                      {new Date(data.job.processedAt).toLocaleString()}
                    </p>
                  ) : null}
                  {data.job.lastError ? (
                    <p className="text-destructive">Last error: {data.job.lastError}</p>
                  ) : null}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>By channel</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm" aria-label="Delivery counts by channel">
                      {Object.entries(data.deliveryAggregates.byChannel).map(([key, count]) => (
                        <li key={key} className="flex justify-between">
                          <span>{key}</span>
                          <span className="font-medium">{count}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>By status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm" aria-label="Delivery counts by status">
                      {Object.entries(data.deliveryAggregates.byStatus).map(([key, count]) => (
                        <li key={key} className="flex justify-between">
                          <span>{key}</span>
                          <span className="font-medium">{count}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        )}
      </div>
    </PermissionGate>
  );
}
