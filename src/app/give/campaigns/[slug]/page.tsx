'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiGet } from '@/lib/api/client';
import { GiveForm } from '@/components/giving/GiveForm';
import { Section } from '@/components/layout/Section';
import { PageHero } from '@/components/sections/PageHero';
import { Progress } from '@/components/ui/progress';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Campaign {
  title: string;
  slug: string;
  description: string | null;
  targetAmount: string;
  raisedAmount: string;
  currency: string;
  progressPercent: number;
  startAt: string | null;
  endAt: string | null;
  status: string;
}

export default function CampaignDetailPage() {
  const params = useParams<{ slug: string }>();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [missing, setMissing] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (!params.slug) return;
    void apiGet<{ campaign: Campaign }>(`/giving/campaigns/${params.slug}`).then((result) => {
      if (!result.success || !result.data?.campaign) {
        setMissing(true);
        return;
      }
      setCampaign(result.data.campaign);
    });
  }, [params.slug]);

  if (missing) {
    return (
      <Section>
        <Card>
          <CardHeader>
            <CardTitle>Campaign not found</CardTitle>
            <CardDescription>
              <Link className="underline" href="/give/campaigns">
                Back to campaigns
              </Link>
            </CardDescription>
          </CardHeader>
        </Card>
      </Section>
    );
  }

  if (!campaign) {
    return (
      <Section>
        <p className="text-sm text-muted-foreground">Loading campaign…</p>
      </Section>
    );
  }

  if (showForm) {
    return <GiveForm initialCampaign={campaign.slug} />;
  }

  return (
    <div className="page-transition">
      <PageHero
        title={campaign.title}
        subtitle="Campaign"
        description={campaign.description || 'Support this campaign with a contribution.'}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Give', href: '/give' },
          { label: 'Campaigns', href: '/give/campaigns' },
          { label: campaign.title },
        ]}
      />
      <Section>
        <div className="mx-auto max-w-2xl space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Progress</CardTitle>
              <CardDescription>
                Raised from successful contributions only. Pending and refunded amounts are excluded.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-lg font-medium">
                {campaign.raisedAmount} / {campaign.targetAmount} {campaign.currency}
              </p>
              <Progress value={campaign.progressPercent} />
              <Button onClick={() => setShowForm(true)}>Give to this campaign</Button>
            </CardContent>
          </Card>
        </div>
      </Section>
    </div>
  );
}
