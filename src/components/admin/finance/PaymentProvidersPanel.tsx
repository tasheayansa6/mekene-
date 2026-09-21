'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { apiGet, apiPatch } from '@/lib/api/client';
import { useAuth } from '@/components/providers/AuthProvider';
import { PageHeader } from '@/components/admin/PageHeader';
import { PermissionDenied } from '@/components/admin/PermissionDenied';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
import { publicErrorMessage } from '@/lib/admin/http-error';

interface ProviderRow {
  id: string;
  providerKey: string;
  displayName: string;
  environment: string;
  isEnabled: boolean;
  secretConfigured: boolean;
  notes: string | null;
  isActiveRuntime?: boolean;
  supportedCurrencies: string[];
}

export function PaymentProvidersPanel() {
  const { can } = useAuth();
  const canAccess =
    can('finance.view') ||
    can('finance.manage') ||
    can('giving.view') ||
    can('giving.moderate');
  const canWrite = can('finance.manage') || can('giving.moderate');

  const [providers, setProviders] = useState<ProviderRow[]>([]);
  const [activeProviderKey, setActiveProviderKey] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  function load() {
    void apiGet<{
      providers: ProviderRow[];
      activeProviderKey: string;
      note?: string;
    }>('/admin/finance/payment-providers').then((result) => {
      if (!result.success || !result.data) {
        setError(result.message);
        return;
      }
      setProviders(result.data.providers || []);
      setActiveProviderKey(result.data.activeProviderKey || null);
      setNote(result.data.note || null);
      setError(null);
    });
  }

  useEffect(() => {
    if (canAccess) load();
  }, [canAccess]);

  async function updateProvider(
    providerKey: string,
    patch: {
      isEnabled?: boolean;
      environment?: 'sandbox' | 'production';
      notes?: string | null;
    }
  ) {
    setSavingKey(providerKey);
    const result = await apiPatch('/admin/finance/payment-providers', {
      providerKey,
      ...patch,
    });
    setSavingKey(null);
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    toast.success('Provider updated.');
    load();
  }

  if (!canAccess) return <PermissionDenied />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payment providers"
        description="Enable providers and set environment notes. Secret keys are never shown — configure them via environment variables only."
      />

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {note ? <p className="text-sm text-muted-foreground">{note}</p> : null}
      {activeProviderKey ? (
        <p className="text-sm">
          Active runtime provider:{' '}
          <Badge variant="secondary">{activeProviderKey}</Badge>
        </p>
      ) : null}

      <div className="grid gap-4">
        {providers.map((provider) => (
          <Card key={provider.id}>
            <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
              <div>
                <CardTitle className="text-base">{provider.displayName}</CardTitle>
                <CardDescription>
                  Key: {provider.providerKey}
                  {provider.isActiveRuntime ? ' · currently active' : ''}
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant={provider.isEnabled ? 'default' : 'secondary'}>
                  {provider.isEnabled ? 'Enabled' : 'Disabled'}
                </Badge>
                <Badge variant="outline">
                  Secret {provider.secretConfigured ? 'configured' : 'missing'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={provider.isEnabled}
                    disabled={!canWrite || savingKey === provider.providerKey}
                    onCheckedChange={(checked) =>
                      void updateProvider(provider.providerKey, { isEnabled: checked })
                    }
                  />
                  <Label>Enabled</Label>
                </div>
                <div className="space-y-1">
                  <Label>Environment</Label>
                  <Select
                    value={provider.environment}
                    disabled={!canWrite || savingKey === provider.providerKey}
                    onValueChange={(value) =>
                      void updateProvider(provider.providerKey, {
                        environment: value as 'sandbox' | 'production',
                      })
                    }
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sandbox">Sandbox</SelectItem>
                      <SelectItem value="production">Production</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`notes-${provider.id}`}>Notes</Label>
                <Textarea
                  id={`notes-${provider.id}`}
                  defaultValue={provider.notes || ''}
                  disabled={!canWrite}
                  rows={2}
                  onBlur={(e) => {
                    const next = e.target.value.trim() || null;
                    if (next === (provider.notes || null)) return;
                    void updateProvider(provider.providerKey, { notes: next });
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Currencies: {(provider.supportedCurrencies || []).join(', ') || '—'}
              </p>
              {!canWrite ? (
                <p className="text-xs text-muted-foreground">View only.</p>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>

      {providers.length === 0 && !error ? (
        <p className="text-sm text-muted-foreground">No provider configs found.</p>
      ) : null}
    </div>
  );
}
