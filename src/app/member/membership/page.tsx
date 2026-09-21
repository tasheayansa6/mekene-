'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
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

interface MembershipPayload {
  member: {
    status: string;
    membershipNumber: string | null;
    dateJoined: string | null;
  } | null;
  application: {
    status: string;
    statusCode: string;
    submittedAt: string;
    reviewedAt: string | null;
    reviewerMessage: string | null;
  } | null;
}

export default function MembershipStatusPage() {
  const [data, setData] = useState<MembershipPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void apiGet<MembershipPayload>('/members/me/membership').then((result) => {
      setData(result.data);
      setError(result.success ? null : result.message);
      setLoading(false);
    });
  }, []);

  if (loading) return <Skeleton className="h-48 w-full" />;
  if (error) return <ApiErrorAlert message={error} />;

  if (!data?.member && !data?.application) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Membership status</CardTitle>
          <CardDescription>You have not submitted a membership application.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/membership/apply">Apply for membership</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-primary">Membership status</h1>
        <p className="text-sm text-muted-foreground">
          Internal review notes are not shown here. A website account is not church membership.
        </p>
      </div>

      {data.member ? (
        <Card>
          <CardHeader>
            <CardTitle>Church membership</CardTitle>
            <CardDescription>Current status: {data.member.status}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              Membership number:{' '}
              <span className="font-medium">{data.member.membershipNumber || 'Not assigned'}</span>
            </p>
            <p>
              Date joined:{' '}
              {data.member.dateJoined ? new Date(data.member.dateJoined).toLocaleDateString() : '—'}
            </p>
          </CardContent>
        </Card>
      ) : null}

      {data.application ? (
        <Card>
          <CardHeader>
            <CardTitle>Application</CardTitle>
            <CardDescription>{data.application.status}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>Submitted {new Date(data.application.submittedAt).toLocaleDateString()}.</p>
            {data.application.reviewedAt ? (
              <p>Reviewed {new Date(data.application.reviewedAt).toLocaleDateString()}.</p>
            ) : null}
            {data.application.statusCode === 'needs_information' && data.application.reviewerMessage ? (
              <p>{data.application.reviewerMessage}</p>
            ) : null}
            {data.application.statusCode === 'needs_information' ? (
              <Button asChild>
                <Link href="/membership/apply">Update application</Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
