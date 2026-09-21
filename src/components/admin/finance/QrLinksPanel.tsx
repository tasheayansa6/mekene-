'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { apiGet, apiPost } from '@/lib/api/client';
import { useAuth } from '@/components/providers/AuthProvider';
import { PageHeader } from '@/components/admin/PageHeader';
import { PermissionDenied } from '@/components/admin/PermissionDenied';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { publicErrorMessage } from '@/lib/admin/http-error';

interface QrLink {
  id: string;
  slug: string;
  label: string;
  targetType: string;
  categorySlug: string | null;
  campaignSlug: string | null;
  ministrySlug: string | null;
  eventSlug: string | null;
  amountPreset: string | null;
  currency: string | null;
  isActive: boolean;
  url: string;
  qrDataUrl: string;
  createdAt: string;
}

const emptyForm = {
  label: '',
  slug: '',
  targetType: 'general' as 'general' | 'fund' | 'campaign' | 'ministry' | 'event',
  categorySlug: '',
  campaignSlug: '',
  ministrySlug: '',
  eventSlug: '',
  amountPreset: '',
  currency: 'ETB',
};

export function QrLinksPanel() {
  const { can } = useAuth();
  const canAccess =
    can('giving.view') ||
    can('giving.publish') ||
    can('finance.view') ||
    can('finance.manage');
  const canWrite = can('giving.publish') || can('finance.manage');

  const [links, setLinks] = useState<QrLink[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  function load() {
    void apiGet<{ links: QrLink[] }>('/admin/finance/qr-links').then((result) => {
      setLinks(result.data?.links || []);
      setError(result.success ? null : result.message);
    });
  }

  useEffect(() => {
    if (canAccess) load();
  }, [canAccess]);

  async function createLink() {
    if (!form.label.trim()) {
      toast.error('Label is required.');
      return;
    }
    setSaving(true);
    const result = await apiPost('/admin/finance/qr-links', {
      label: form.label.trim(),
      slug: form.slug.trim() || undefined,
      targetType: form.targetType,
      categorySlug: form.categorySlug.trim() || null,
      campaignSlug: form.campaignSlug.trim() || null,
      ministrySlug: form.ministrySlug.trim() || null,
      eventSlug: form.eventSlug.trim() || null,
      amountPreset: form.amountPreset.trim() || null,
      currency: form.currency.trim().toUpperCase() || null,
    });
    setSaving(false);
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    toast.success('QR link created.');
    setForm(emptyForm);
    load();
  }

  async function copyUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('URL copied.');
    } catch {
      toast.error('Could not copy URL.');
    }
  }

  if (!canAccess) return <PermissionDenied />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Giving QR links"
        description="QR codes open the public give form with fund, campaign, or amount presets. They never encode payment credentials."
      />

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {canWrite ? (
        <Card>
          <CardHeader>
            <CardTitle>Create QR link</CardTitle>
            <CardDescription>
              Optional slug, fund, campaign, ministry, event, and amount preset.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="qr-label">Label</Label>
              <Input
                id="qr-label"
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qr-slug">Slug (optional)</Label>
              <Input
                id="qr-slug"
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Target type</Label>
              <Select
                value={form.targetType}
                onValueChange={(value) =>
                  setForm((f) => ({
                    ...f,
                    targetType: value as typeof form.targetType,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="fund">Fund</SelectItem>
                  <SelectItem value="campaign">Campaign</SelectItem>
                  <SelectItem value="ministry">Ministry</SelectItem>
                  <SelectItem value="event">Event</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="qr-currency">Currency</Label>
              <Input
                id="qr-currency"
                value={form.currency}
                onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qr-fund">Fund slug</Label>
              <Input
                id="qr-fund"
                value={form.categorySlug}
                onChange={(e) =>
                  setForm((f) => ({ ...f, categorySlug: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qr-campaign">Campaign slug</Label>
              <Input
                id="qr-campaign"
                value={form.campaignSlug}
                onChange={(e) =>
                  setForm((f) => ({ ...f, campaignSlug: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qr-ministry">Ministry slug</Label>
              <Input
                id="qr-ministry"
                value={form.ministrySlug}
                onChange={(e) =>
                  setForm((f) => ({ ...f, ministrySlug: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qr-event">Event slug</Label>
              <Input
                id="qr-event"
                value={form.eventSlug}
                onChange={(e) => setForm((f) => ({ ...f, eventSlug: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qr-amount">Amount preset</Label>
              <Input
                id="qr-amount"
                value={form.amountPreset}
                onChange={(e) =>
                  setForm((f) => ({ ...f, amountPreset: e.target.value }))
                }
                placeholder="500"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={() => void createLink()} disabled={saving}>
                {saving ? 'Creating…' : 'Create QR link'}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {links.map((link) => (
          <Card key={link.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base">{link.label}</CardTitle>
                <Badge variant={link.isActive ? 'default' : 'secondary'}>
                  {link.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <CardDescription>
                {link.targetType} · /give/q/{link.slug}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={link.qrDataUrl}
                alt={`QR for ${link.label}`}
                className="mx-auto size-40 rounded-md border bg-white p-2"
              />
              <p className="break-all text-xs text-muted-foreground">{link.url}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => void copyUrl(link.url)}
              >
                Copy URL
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {links.length === 0 && !error ? (
        <p className="text-sm text-muted-foreground">No QR links yet.</p>
      ) : null}
    </div>
  );
}
