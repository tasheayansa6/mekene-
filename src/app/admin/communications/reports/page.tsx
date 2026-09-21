'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api/client';
import { PageHeader } from '@/components/admin/PageHeader';
import { PermissionGate } from '@/components/admin/PermissionGate';
import { ApiErrorAlert } from '@/components/admin/ApiErrorAlert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface ReportData {
  totals: { jobs: number; sent: number; failed: number; pending: number };
  byChannel: Record<string, number>;
  byStatus: Record<string, number>;
}

export default function AdminCommunicationsReportsPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [channel, setChannel] = useState('');
  const [status, setStatus] = useState('');
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const params: Record<string, string> = {};
    if (from) params.from = from;
    if (to) params.to = to;
    if (channel) params.channel = channel;
    if (status) params.status = status;

    const result = await apiGet<ReportData>('/admin/communications/reports', params);
    setLoading(false);
    if (!result.success || !result.data) {
      setError(result.message);
      return;
    }
    setError(null);
    setData(result.data);
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <PermissionGate permission="communications.view">
      <div className="space-y-6">
        <PageHeader
          title="Communication reports"
          description="Aggregate delivery metrics without recipient PII."
          actions={
            <Button asChild variant="outline">
              <Link href="/admin/communications">Back</Link>
            </Button>
          }
        />

        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Filter by date range, channel, or delivery status.</CardDescription>
          </CardHeader>
          <div className="grid gap-4 px-6 pb-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="from">From</Label>
              <Input id="from" type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="to">To</Label>
              <Input id="to" type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="channel">Channel</Label>
              <Input
                id="channel"
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                placeholder="in_app, email, sms…"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Input
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                placeholder="sent, failed…"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <Button onClick={() => void load()}>Apply filters</Button>
            </div>
          </div>
        </Card>

        {error ? <ApiErrorAlert message={error} /> : null}

        {loading ? (
          <Skeleton className="h-40 w-full" />
        ) : data ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Card>
                <CardHeader>
                  <CardDescription>Jobs</CardDescription>
                  <CardTitle>{data.totals.jobs}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardDescription>Sent</CardDescription>
                  <CardTitle>{data.totals.sent}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardDescription>Failed</CardDescription>
                  <CardTitle>{data.totals.failed}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardDescription>Pending</CardDescription>
                  <CardTitle>{data.totals.pending}</CardTitle>
                </CardHeader>
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>By channel</CardTitle>
                </CardHeader>
                <ul className="space-y-2 px-6 pb-6 text-sm" aria-label="Deliveries by channel">
                  {Object.entries(data.byChannel).map(([key, count]) => (
                    <li key={key} className="flex justify-between">
                      <span>{key}</span>
                      <span className="font-medium">{count}</span>
                    </li>
                  ))}
                </ul>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>By status</CardTitle>
                </CardHeader>
                <ul className="space-y-2 px-6 pb-6 text-sm" aria-label="Deliveries by status">
                  {Object.entries(data.byStatus).map(([key, count]) => (
                    <li key={key} className="flex justify-between">
                      <span>{key}</span>
                      <span className="font-medium">{count}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </>
        ) : null}
      </div>
    </PermissionGate>
  );
}
