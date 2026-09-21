'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api/client';
import { Section } from '@/components/layout/Section';
import { PageHero } from '@/components/sections/PageHero';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface Campaign {
  title: string;
  slug: string;
  description: string | null;
  targetAmount: string;
  raisedAmount: string;
  currency: string;
  progressPercent: number;
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  useEffect(() => {
    void apiGet<{ campaigns: Campaign[] }>('/giving/campaigns').then((result) => {
      setCampaigns(result.data?.campaigns || []);
    });
  }, []);

  return (
    <div className="page-transition">
      <PageHero
        title="Campaigns"
        subtitle="Give"
        description="Active giving campaigns. Donor names are not listed publicly."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Give', href: '/give' },
          { label: 'Campaigns' },
        ]}
      />
      <Section>
        <div className="mx-auto grid max-w-4xl gap-4">
          {campaigns.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No active campaigns</CardTitle>
                <CardDescription>
                  You can still give a general contribution from the{' '}
                  <Link className="underline" href="/give">
                    Give
                  </Link>{' '}
                  page.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            campaigns.map((campaign) => (
              <Card key={campaign.slug}>
                <CardHeader>
                  <CardTitle>{campaign.title}</CardTitle>
                  <CardDescription>{campaign.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm">
                    {campaign.raisedAmount} / {campaign.targetAmount} {campaign.currency}
                  </p>
                  <Progress value={campaign.progressPercent} />
                  <Button asChild>
                    <Link href={`/give/campaigns/${campaign.slug}`}>View & give</Link>
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </Section>
    </div>
  );
}
