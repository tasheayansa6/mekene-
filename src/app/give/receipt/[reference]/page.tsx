'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiGet } from '@/lib/api/client';
import { Section } from '@/components/layout/Section';
import { PageHero } from '@/components/sections/PageHero';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Receipt {
  churchName: string;
  receiptNumber: string | null;
  reference: string;
  date: string;
  amount: string;
  currency: string;
  contributionType: string;
  campaign: string | null;
  donorName: string;
  isAnonymous: boolean;
}

export default function ReceiptPage() {
  const params = useParams<{ reference: string }>();
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    if (!params.reference) return;
    void apiGet<{ receipt?: Receipt; pending?: boolean; message?: string }>(
      `/giving/receipts/${params.reference}`
    ).then((result) => {
      if (result.data?.receipt) {
        setReceipt(result.data.receipt);
        return;
      }
      setPending(result.data?.message || 'Contribution is not complete yet.');
    });
  }, [params.reference]);

  return (
    <div className="page-transition">
      <PageHero
        title="Contribution receipt"
        subtitle="Give"
        description="Receipts never include card numbers, CVV, or payment secrets."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Give', href: '/give' },
          { label: 'Receipt' },
        ]}
      />
      <Section>
        <div className="mx-auto max-w-xl">
          {receipt ? (
            <Card>
              <CardHeader>
                <CardTitle>{receipt.churchName}</CardTitle>
                <CardDescription>
                  {receipt.receiptNumber || 'Receipt pending number'} · {receipt.reference}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>
                  <strong>Date:</strong> {new Date(receipt.date).toLocaleString()}
                </p>
                <p>
                  <strong>Amount:</strong> {receipt.amount} {receipt.currency}
                </p>
                <p>
                  <strong>Type:</strong> {receipt.contributionType}
                </p>
                {receipt.campaign ? (
                  <p>
                    <strong>Campaign:</strong> {receipt.campaign}
                  </p>
                ) : null}
                <p>
                  <strong>Donor:</strong> {receipt.donorName}
                  {receipt.isAnonymous ? ' (anonymous display)' : ''}
                </p>
                <div className="flex gap-2 pt-2">
                  <Button asChild variant="outline">
                    <Link href="/give">Give again</Link>
                  </Button>
                  <Button asChild variant="ghost">
                    <Link href="/member/giving">My giving</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Receipt status</CardTitle>
                <CardDescription>{pending || 'Loading…'}</CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>
      </Section>
    </div>
  );
}
