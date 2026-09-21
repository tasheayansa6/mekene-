'use client';

import { useEffect, useState } from 'react';
import { apiGet, apiPatch } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';

interface Preferences {
  emailAnnouncements: boolean;
  emailEvents: boolean;
  emailMinistry: boolean;
  emailMarketing: boolean;
  inAppGeneral: boolean;
  inAppEvents: boolean;
  inAppMembership: boolean;
  telegramEnabled: boolean;
  smsEnabled: boolean;
}

const FIELDS: Array<{ key: keyof Preferences; label: string; help: string }> = [
  {
    key: 'inAppGeneral',
    label: 'In-app general notices',
    help: 'Announcements and church notices in your portal.',
  },
  {
    key: 'inAppEvents',
    label: 'In-app event reminders',
    help: 'Reminders for upcoming events.',
  },
  {
    key: 'inAppMembership',
    label: 'In-app membership updates',
    help: 'Application and membership status updates.',
  },
  {
    key: 'emailAnnouncements',
    label: 'Email announcements',
    help: 'Church announcements by email.',
  },
  {
    key: 'emailEvents',
    label: 'Email event reminders',
    help: 'Event reminders by email.',
  },
  {
    key: 'emailMinistry',
    label: 'Email ministry updates',
    help: 'Updates from ministries you belong to.',
  },
  {
    key: 'emailMarketing',
    label: 'Email optional updates',
    help: 'Non-essential newsletters and campaigns.',
  },
  {
    key: 'telegramEnabled',
    label: 'Telegram notifications',
    help: 'Church notices via Telegram when configured.',
  },
  {
    key: 'smsEnabled',
    label: 'SMS notifications',
    help: 'Text message alerts when your phone number is on file.',
  },
];

export default function NotificationPreferencesPage() {
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void apiGet<{ preferences: Preferences }>('/notification-preferences').then((result) => {
      if (!result.success || !result.data) {
        setError(result.message);
        return;
      }
      setPrefs(result.data.preferences);
    });
  }, []);

  async function save() {
    if (!prefs) return;
    setSaving(true);
    setMessage(null);
    const result = await apiPatch<{ preferences: Preferences }>(
      '/notification-preferences',
      prefs
    );
    setSaving(false);
    if (!result.success || !result.data) {
      setError(result.message);
      return;
    }
    setError(null);
    setPrefs(result.data.preferences);
    setMessage('Preferences saved.');
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Notification preferences</h1>
        <p className="text-sm text-muted-foreground">
          Transactional membership and giving notices may still be delivered when required.
        </p>
      </div>

      {!prefs ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Channels</CardTitle>
            <CardDescription>Choose how you receive church communications.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {FIELDS.map((field) => (
              <div key={field.key} className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <Label htmlFor={field.key}>{field.label}</Label>
                  <p className="text-xs text-muted-foreground">{field.help}</p>
                </div>
                <Switch
                  id={field.key}
                  checked={prefs[field.key]}
                  onCheckedChange={(checked) =>
                    setPrefs((prev) => (prev ? { ...prev, [field.key]: checked } : prev))
                  }
                />
              </div>
            ))}
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
            <Button onClick={() => void save()} disabled={saving}>
              {saving ? 'Saving…' : 'Save preferences'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
