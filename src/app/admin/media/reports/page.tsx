'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api/client';
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

type ReportRow = {
  id: string;
  reason: string;
  details: string | null;
  status: string;
  createdAt: string;
  sermon: { id: string; title: string; slug: string };
  reporter: { id: string; name: string } | null;
};

export default function AdminMediaReportsPage() {
  const [reports, setReports] = useState<ReportRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void apiGet<{ reports: ReportRow[] }>('/admin/media/reports').then((result) => {
      if (!result.success || !result.data) {
        setError(result.message);
        setReports([]);
        return;
      }
      const data = result.data as { reports?: ReportRow[] };
      setReports(data.reports || []);
    });
  }, []);

  return (
    <PermissionGate permission="media.view">
      <div className="space-y-6">
        <PageHeader
          title="Media reports"
          description="Open content reports submitted by members or visitors."
          actions={
            <Button asChild variant="outline">
              <Link href="/admin/media">Back to media</Link>
            </Button>
          }
        />
        {error ? <ApiErrorAlert message={error} /> : null}
        {!reports ? <Skeleton className="h-40 w-full" /> : null}
        {reports && reports.length === 0 ? (
          <p className="text-sm text-muted-foreground">No open reports.</p>
        ) : (
          <ul className="space-y-3">
            {reports?.map((report) => (
              <li key={report.id}>
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <CardTitle className="text-base">{report.reason}</CardTitle>
                      <Badge variant="outline">{report.status}</Badge>
                    </div>
                    <CardDescription>
                      <Link className="hover:text-primary" href={`/admin/sermons/${report.sermon.id}`}>
                        {report.sermon.title}
                      </Link>
                      {' · '}
                      {new Date(report.createdAt).toLocaleString()}
                      {report.reporter ? ` · ${report.reporter.name}` : ''}
                    </CardDescription>
                  </CardHeader>
                  {report.details ? (
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{report.details}</p>
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
