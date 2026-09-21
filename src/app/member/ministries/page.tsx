'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api/client';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiErrorAlert } from '@/components/admin/ApiErrorAlert';

interface Participation {
  id: string;
  roleLabel: string | null;
  status: string;
  ministry: { id: string; name: string; slug: string };
}

export default function MemberMinistriesPage() {
  const [rows, setRows] = useState<Participation[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void apiGet<{ ministries: Participation[] }>('/members/me/ministries').then((result) => {
      setRows(result.data?.ministries || []);
      setError(result.success ? null : result.message);
    });
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-primary">My Ministries</h1>
        <p className="text-sm text-muted-foreground">
          Participation is recorded by church staff. This does not grant ministry leadership permissions.
        </p>
      </div>
      {error ? <ApiErrorAlert message={error} /> : null}
      {rows === null ? (
        <Skeleton className="h-40 w-full" />
      ) : rows.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No ministry participation yet</CardTitle>
            <CardDescription>
              When staff record your ministry involvement, it will appear here.{' '}
              <Link className="underline" href="/ministries">
                Browse ministries
              </Link>
              .
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {rows.map((row) => (
            <Card key={row.id}>
              <CardHeader>
                <CardTitle>
                  <Link className="hover:underline" href={`/ministries/${row.ministry.slug}`}>
                    {row.ministry.name}
                  </Link>
                </CardTitle>
                <CardDescription>
                  {row.status}
                  {row.roleLabel ? ` · ${row.roleLabel}` : ''}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
