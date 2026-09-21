'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { apiGet, apiPost } from '@/lib/api/client';
import { PageHeader } from '@/components/admin/PageHeader';
import { PermissionGate } from '@/components/admin/PermissionGate';
import { ApiErrorAlert } from '@/components/admin/ApiErrorAlert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

type JobRow = {
  id: string;
  type: string;
  status: string;
  targetKind: string;
  targetId: string | null;
  attemptCount: number;
  maxAttempts: number;
  lastError: string | null;
  createdAt: string;
  processedAt: string | null;
};

export default function AdminMediaJobsPage() {
  const [jobs, setJobs] = useState<JobRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  async function load() {
    const result = await apiGet<{ jobs: JobRow[] }>('/admin/media/jobs', { pageSize: '30' });
    if (!result.success || !result.data) {
      setError(result.message);
      setJobs([]);
      return;
    }
    setJobs(result.data.jobs);
  }

  useEffect(() => {
    void load();
  }, []);

  async function processJobs() {
    setProcessing(true);
    const result = await apiPost('/admin/media/jobs', { action: 'process', limit: 10 });
    setProcessing(false);
    if (!result.success) {
      toast.error(result.message);
      return;
    }
    toast.success(result.message || 'Jobs processed.');
    await load();
  }

  return (
    <PermissionGate permission="media.view">
      <div className="space-y-6">
        <PageHeader
          title="Media jobs"
          description="Background processing queue for media tasks."
          actions={
            <div className="flex gap-2">
              <Button onClick={() => void processJobs()} disabled={processing}>
                {processing ? 'Processing…' : 'Process pending jobs'}
              </Button>
              <Button asChild variant="outline">
                <Link href="/admin/media">Back to media</Link>
              </Button>
            </div>
          }
        />
        {error ? <ApiErrorAlert message={error} /> : null}
        {!jobs ? <Skeleton className="h-40 w-full" /> : null}
        {jobs && jobs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No jobs in the queue.</p>
        ) : (
          <ul className="space-y-3">
            {jobs?.map((job) => (
              <li key={job.id}>
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <CardTitle className="text-base">{job.type}</CardTitle>
                      <Badge variant="outline">{job.status}</Badge>
                    </div>
                    <CardDescription>
                      {job.targetKind}
                      {job.targetId ? ` · ${job.targetId}` : ''} · attempt {job.attemptCount}/
                      {job.maxAttempts}
                    </CardDescription>
                  </CardHeader>
                  {job.lastError ? (
                    <CardContent>
                      <p className="text-xs text-destructive">{job.lastError}</p>
                    </CardContent>
                  ) : null}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PermissionGate>
  );
}
