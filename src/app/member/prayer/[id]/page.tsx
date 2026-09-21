'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiGet } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiErrorAlert } from '@/components/admin/ApiErrorAlert';

interface Detail {
  id: string;
  title: string;
  content: string;
  statusLabel: string;
  createdAt: string;
  updatedAt: string;
  requesterMessage: string | null;
  category: { name: string } | null;
}

export default function MemberPrayerDetailPage() {
  const params = useParams<{ id: string }>();
  const [row, setRow] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params.id) return;
    void apiGet<Detail>(`/prayer/my/${params.id}`).then((result) => {
      setRow(result.data);
      setError(result.success ? null : result.message);
      setLoading(false);
    });
  }, [params.id]);

  if (loading) return <Skeleton className="h-64 w-full" />;

  if (error || !row) {
    return (
      <div className="space-y-4">
        <ApiErrorAlert message={error || 'This prayer request was not found.'} />
        <Button asChild variant="outline">
          <Link href="/member/prayer">Back to my requests</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost">
        <Link href="/member/prayer">Back to my requests</Link>
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>{row.title}</CardTitle>
          <CardDescription>
            {row.statusLabel}
            {row.category ? ` · ${row.category.name}` : ''}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="whitespace-pre-wrap leading-relaxed">{row.content}</p>
          <p className="text-sm text-muted-foreground">
            Submitted {new Date(row.createdAt).toLocaleString()}
          </p>
          {row.requesterMessage ? (
            <div className="rounded-md border bg-muted/40 p-4">
              <p className="text-sm font-medium">Update from the prayer team</p>
              <p className="mt-2 text-sm">{row.requesterMessage}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
