'use client';

import { useState } from 'react';
import Link from 'next/link';
import { apiPost } from '@/lib/api/client';
import { PageHeader } from '@/components/admin/PageHeader';
import { PermissionGate } from '@/components/admin/PermissionGate';
import { ApiErrorAlert } from '@/components/admin/ApiErrorAlert';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function AdminCommunicationsEmergencyPage() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState('everyone');
  const [channelInApp, setChannelInApp] = useState(true);
  const [channelEmail, setChannelEmail] = useState(true);
  const [channelSms, setChannelSms] = useState(false);
  const [channelTelegram, setChannelTelegram] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    const channels = [
      ...(channelInApp ? (['in_app'] as const) : []),
      ...(channelEmail ? (['email'] as const) : []),
      ...(channelSms ? (['sms'] as const) : []),
      ...(channelTelegram ? (['telegram'] as const) : []),
    ];
    if (channels.length === 0) {
      setError('Select at least one channel.');
      setSaving(false);
      return;
    }

    const result = await apiPost('/admin/communications/emergency', {
      title,
      message,
      audience,
      channels,
      confirm,
      confirmText,
    });
    setSaving(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    setSuccess(result.message || 'Emergency broadcast queued.');
    setTitle('');
    setMessage('');
    setConfirm(false);
    setConfirmText('');
  }

  return (
    <PermissionGate permission="communications.manage">
      <div className="space-y-6">
        <PageHeader
          title="Emergency broadcast"
          description="Transactional emergency notices bypass member opt-outs. Use only for urgent safety alerts."
          actions={
            <Button asChild variant="outline">
              <Link href="/admin/communications">Back</Link>
            </Button>
          }
        />

        {error ? <ApiErrorAlert message={error} /> : null}
        {success ? <p className="text-sm text-muted-foreground">{success}</p> : null}

        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle>Compose emergency message</CardTitle>
            <CardDescription>
              You must type SEND EMERGENCY and confirm before sending.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={160}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={1000}
                  required
                  rows={5}
                />
              </div>
              <div className="space-y-2">
                <Label>Audience</Label>
                <Select value={audience} onValueChange={setAudience}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="everyone">Everyone</SelectItem>
                    <SelectItem value="members">Members</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <fieldset className="flex flex-wrap gap-4 text-sm">
                <legend className="sr-only">Channels</legend>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={channelInApp}
                    onChange={(e) => setChannelInApp(e.target.checked)}
                  />
                  In-app
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={channelEmail}
                    onChange={(e) => setChannelEmail(e.target.checked)}
                  />
                  Email
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={channelSms}
                    onChange={(e) => setChannelSms(e.target.checked)}
                  />
                  SMS
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={channelTelegram}
                    onChange={(e) => setChannelTelegram(e.target.checked)}
                  />
                  Telegram
                </label>
              </fieldset>
              <div className="space-y-2">
                <Label htmlFor="confirmText">Type SEND EMERGENCY</Label>
                <Input
                  id="confirmText"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  autoComplete="off"
                  required
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={confirm}
                  onChange={(e) => setConfirm(e.target.checked)}
                  required
                />
                I confirm this is an urgent emergency broadcast
              </label>
              <Button type="submit" variant="destructive" disabled={saving}>
                {saving ? 'Sending…' : 'Send emergency broadcast'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </PermissionGate>
  );
}
