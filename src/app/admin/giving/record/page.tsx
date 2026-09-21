'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { apiGet, apiPost } from '@/lib/api/client';
import { PageHeader } from '@/components/admin/PageHeader';
import { PermissionGate } from '@/components/admin/PermissionGate';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { publicErrorMessage } from '@/lib/admin/http-error';

interface Options {
  categories: Array<{ id: string; name: string }>;
  campaigns: Array<{ id: string; title: string; status: string }>;
}

export default function RecordOfflinePage() {
  const [options, setOptions] = useState<Options | null>(null);
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [campaignId, setCampaignId] = useState('none');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank_transfer' | 'other'>('cash');
  const [offlineReference, setOfflineReference] = useState('');
  const [guestName, setGuestName] = useState('');
  const [note, setNote] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);

  useEffect(() => {
    void apiGet<Options>('/admin/giving/options').then((result) => {
      setOptions(result.data || null);
      if (result.data?.categories[0]) setCategoryId(result.data.categories[0].id);
    });
  }, []);

  async function submit() {
    const result = await apiPost('/admin/giving/contributions', {
      amount,
      currency: 'ETB',
      categoryId,
      campaignId: campaignId === 'none' ? null : campaignId,
      paymentMethod,
      offlineReference: offlineReference || null,
      guestName: guestName || null,
      note: note || null,
      isAnonymous,
      status: 'successful',
    });
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    toast.success('Offline contribution recorded.');
    setAmount('');
    setOfflineReference('');
    setNote('');
  }

  return (
    <PermissionGate permission="giving.create">
      <div className="space-y-6">
        <PageHeader
          title="Record offline contribution"
          description="Cash, bank transfer, and other manual gifts. Requires finance authorization and is audited."
        />
        <Card>
          <CardHeader>
            <CardTitle>Manual entry</CardTitle>
            <CardDescription>Ordinary members cannot create these records.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (ETB)</Label>
              <Input id="amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(options?.categories || []).map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Campaign</Label>
              <Select value={campaignId} onValueChange={setCampaignId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {(options?.campaigns || []).map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Method</Label>
              <Select
                value={paymentMethod}
                onValueChange={(value) =>
                  setPaymentMethod(value as 'cash' | 'bank_transfer' | 'other')
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank_transfer">Bank transfer</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ref">Reference</Label>
              <Input
                id="ref"
                value={offlineReference}
                onChange={(e) => setOfflineReference(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="donor">Donor name (optional)</Label>
              <Input id="donor" value={guestName} onChange={(e) => setGuestName(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="anon"
                checked={isAnonymous}
                onCheckedChange={(checked) => setIsAnonymous(checked === true)}
              />
              <Label htmlFor="anon">Anonymous for public display</Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="note">Note</Label>
              <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            <Button onClick={() => void submit()} disabled={!amount || !categoryId}>
              Save contribution
            </Button>
          </CardContent>
        </Card>
      </div>
    </PermissionGate>
  );
}
