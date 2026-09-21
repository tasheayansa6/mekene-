'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { apiGet, apiPost } from '@/lib/api/client';
import { PageHeader } from '@/components/admin/PageHeader';
import { PermissionGate } from '@/components/admin/PermissionGate';
import { ApiErrorAlert } from '@/components/admin/ApiErrorAlert';
import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { publicErrorMessage } from '@/lib/admin/http-error';

interface Detail {
  contribution: {
    id: string;
    reference: string;
    receiptNumber: string | null;
    amount: string;
    netAmount: string;
    currency: string;
    statusLabel: string;
    paymentMethodLabel: string;
    isAnonymous: boolean;
    note: string | null;
    category: { name: string } | null;
    campaign: { title: string } | null;
  };
  transactions: Array<{
    id: string;
    provider: string;
    providerReference: string | null;
    status: string;
    amount: string;
    currency: string;
  }>;
  refunds: Array<{ id: string; amount: string; reason: string; createdAt: string }>;
}

export default function ContributionDetailPage() {
  const { can } = useAuth();
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [reason, setReason] = useState('');

  function load() {
    if (!params.id) return;
    void apiGet<Detail>(`/admin/giving/contributions/${params.id}`).then((result) => {
      if (!result.success || !result.data) {
        setError(result.message);
        return;
      }
      setData(result.data);
    });
  }

  useEffect(() => {
    load();
  }, [params.id]);

  async function refund() {
    if (!params.id) return;
    const result = await apiPost(`/admin/giving/contributions/${params.id}`, {
      amount: refundAmount,
      reason,
    });
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    toast.success('Refund recorded.');
    setRefundAmount('');
    setReason('');
    load();
  }

  if (error) return <ApiErrorAlert message={error} />;
  if (!data) return <Skeleton className="h-48 w-full" />;

  const row = data.contribution;

  return (
    <PermissionGate permission="giving.view">
      <div className="space-y-6">
        <PageHeader
          title={row.reference}
          description={`${row.statusLabel} · ${row.paymentMethodLabel}`}
        />
        <Card>
          <CardHeader>
            <CardTitle>
              {row.amount} {row.currency}
            </CardTitle>
            <CardDescription>
              Net {row.netAmount} {row.currency}
              {row.receiptNumber ? ` · Receipt ${row.receiptNumber}` : ''}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>Type: {row.category?.name}</p>
            <p>Campaign: {row.campaign?.title || '—'}</p>
            <p>Anonymous display: {row.isAnonymous ? 'Yes' : 'No'}</p>
            {row.note ? <p>Note: {row.note}</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment transactions</CardTitle>
            <CardDescription>No card numbers or provider secrets are stored.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data.transactions.map((txn) => (
              <p key={txn.id}>
                {txn.provider} · {txn.status} · {txn.amount} {txn.currency}
                {txn.providerReference ? ` · ${txn.providerReference}` : ''}
              </p>
            ))}
          </CardContent>
        </Card>

        {can('giving.cancel') ? (
          <Card>
            <CardHeader>
              <CardTitle>Record refund</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="refund-amount">Amount (ETB)</Label>
                <Input
                  id="refund-amount"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="refund-reason">Reason</Label>
                <Textarea
                  id="refund-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
              <Button onClick={() => void refund()} disabled={!refundAmount || reason.trim().length < 3}>
                Save refund
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </PermissionGate>
  );
}
