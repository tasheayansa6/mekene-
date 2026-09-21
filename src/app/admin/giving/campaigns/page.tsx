'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { apiGet, apiPost, apiPatch } from '@/lib/api/client';
import { PageHeader } from '@/components/admin/PageHeader';
import { PermissionGate } from '@/components/admin/PermissionGate';
import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { publicErrorMessage } from '@/lib/admin/http-error';

interface Campaign {
  id: string;
  title: string;
  slug: string;
  status: string;
  statusLabel: string;
  targetAmount: string;
  raisedAmount: string;
  currency: string;
  progressPercent: number;
}

export default function CampaignsAdminPage() {
  const { can } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [description, setDescription] = useState('');

  function load() {
    void apiGet<{ campaigns: Campaign[] }>('/admin/giving/campaigns').then((result) => {
      setCampaigns(result.data?.campaigns || []);
    });
  }

  useEffect(() => {
    load();
  }, []);

  async function create() {
    const result = await apiPost('/admin/giving/campaigns', {
      title,
      targetAmount,
      description: description || null,
      currency: 'ETB',
      status: 'draft',
    });
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    toast.success('Campaign created as draft.');
    setTitle('');
    setTargetAmount('');
    setDescription('');
    load();
  }

  async function setStatus(id: string, status: string) {
    const result = await apiPatch(`/admin/giving/campaigns/${id}`, { status });
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    toast.success('Campaign updated.');
    load();
  }

  return (
    <PermissionGate permission="giving.view">
      <div className="space-y-6">
        <PageHeader
          title="Donation campaigns"
          description="Only active campaigns accept normal campaign contributions. Do not invent church campaigns without leadership approval."
        />

        {can('giving.publish') ? (
          <Card>
            <CardHeader>
              <CardTitle>Create campaign</CardTitle>
              <CardDescription>Starts in draft until activated.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="target">Target (ETB)</Label>
                <Input
                  id="target"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="desc">Description</Label>
                <Textarea
                  id="desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <Button onClick={() => void create()} disabled={!title || !targetAmount}>
                Create draft
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <div className="space-y-3">
          {campaigns.map((campaign) => (
            <Card key={campaign.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div>
                  <CardTitle>{campaign.title}</CardTitle>
                  <CardDescription>
                    {campaign.raisedAmount} / {campaign.targetAmount} {campaign.currency} ·{' '}
                    {campaign.progressPercent}%
                  </CardDescription>
                </div>
                <Badge>{campaign.statusLabel}</Badge>
              </CardHeader>
              {can('giving.publish') ? (
                <CardContent className="flex flex-wrap gap-2">
                  {campaign.status !== 'active' ? (
                    <Button size="sm" onClick={() => void setStatus(campaign.id, 'active')}>
                      Activate
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void setStatus(campaign.id, 'paused')}
                    >
                      Pause
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void setStatus(campaign.id, 'archived')}
                  >
                    Archive
                  </Button>
                </CardContent>
              ) : null}
            </Card>
          ))}
        </div>
      </div>
    </PermissionGate>
  );
}
