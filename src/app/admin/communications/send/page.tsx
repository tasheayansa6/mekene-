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

interface AudiencePreview {
  recipientCount: number;
  channels: { in_app: number; email: number; telegram: number; sms: number };
}

export default function AdminCommunicationsSendPage() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState('members');
  const [ministryId, setMinistryId] = useState('');
  const [eventId, setEventId] = useState('');
  const [channelInApp, setChannelInApp] = useState(true);
  const [channelEmail, setChannelEmail] = useState(false);
  const [channelTelegram, setChannelTelegram] = useState(false);
  const [channelSms, setChannelSms] = useState(false);
  const [priority, setPriority] = useState('normal');
  const [scheduledAt, setScheduledAt] = useState('');
  const [recurrenceRule, setRecurrenceRule] = useState<string>('none');
  const [recurrenceUntil, setRecurrenceUntil] = useState('');
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const [preview, setPreview] = useState<AudiencePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  const isBulk =
    audience === 'everyone' ||
    audience === 'members' ||
    audience === 'staff' ||
    audience === 'volunteers';

  function buildChannels() {
    return [
      ...(channelInApp ? (['in_app'] as const) : []),
      ...(channelEmail ? (['email'] as const) : []),
      ...(channelTelegram ? (['telegram'] as const) : []),
      ...(channelSms ? (['sms'] as const) : []),
    ];
  }

  async function onPreview() {
    setPreviewing(true);
    setError(null);
    const channels = buildChannels();
    if (channels.length === 0) {
      setError('Select at least one channel.');
      setPreviewing(false);
      return;
    }
    const result = await apiPost<{ preview: AudiencePreview }>(
      '/admin/communications/audience-preview',
      {
        audience,
        ministryId: ministryId.trim() || null,
        eventId: eventId.trim() || null,
        channels,
      }
    );
    setPreviewing(false);
    if (!result.success || !result.data) {
      setError(result.message);
      return;
    }
    setPreview(result.data.preview);
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    const channels = buildChannels();
    if (channels.length === 0) {
      setError('Select at least one channel.');
      setSaving(false);
      return;
    }
    if (isBulk && !bulkConfirm) {
      setError('Bulk sends require confirmation.');
      setSaving(false);
      return;
    }

    const result = await apiPost('/admin/communications/send', {
      title,
      message,
      audience,
      ministryId: ministryId.trim() || null,
      eventId: eventId.trim() || null,
      channels,
      priority,
      scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
      recurrenceRule: recurrenceRule === 'weekly' ? 'weekly' : null,
      recurrenceUntil:
        recurrenceRule === 'weekly' && recurrenceUntil
          ? new Date(recurrenceUntil).toISOString()
          : null,
      bulk: isBulk,
      confirm: isBulk ? bulkConfirm : undefined,
    });
    setSaving(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    setSuccess(result.message || 'Queued.');
    setTitle('');
    setMessage('');
    setPreview(null);
  }

  return (
    <PermissionGate permission="communications.assign">
      <div className="space-y-6">
        <PageHeader
          title="Send notice"
          description="Queue notices across in-app, email, Telegram, and SMS. Emergency broadcasts use the dedicated emergency page."
          actions={
            <Button asChild variant="outline">
              <Link href="/admin/communications">Overview</Link>
            </Button>
          }
        />

        {error ? <ApiErrorAlert message={error} /> : null}
        {success ? <p className="text-sm text-muted-foreground">{success}</p> : null}

        <Card>
          <CardHeader>
            <CardTitle>Compose</CardTitle>
            <CardDescription>Messages are sanitized. Do not include secrets.</CardDescription>
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
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Audience</Label>
                  <Select value={audience} onValueChange={setAudience}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="everyone">Everyone (bulk)</SelectItem>
                      <SelectItem value="members">Members (bulk)</SelectItem>
                      <SelectItem value="volunteers">Volunteers (bulk)</SelectItem>
                      <SelectItem value="ministry">Ministry</SelectItem>
                      <SelectItem value="ministry_leaders">Ministry leaders</SelectItem>
                      <SelectItem value="staff">Staff (bulk)</SelectItem>
                      <SelectItem value="event_registrants">Event registrants</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="important">Important</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {(audience === 'ministry' || audience === 'ministry_leaders') && (
                <div className="space-y-2">
                  <Label htmlFor="ministryId">Ministry ID</Label>
                  <Input
                    id="ministryId"
                    value={ministryId}
                    onChange={(e) => setMinistryId(e.target.value)}
                    placeholder="Required for ministry audiences"
                  />
                </div>
              )}
              {audience === 'event_registrants' && (
                <div className="space-y-2">
                  <Label htmlFor="eventId">Event ID</Label>
                  <Input
                    id="eventId"
                    value={eventId}
                    onChange={(e) => setEventId(e.target.value)}
                    placeholder="Required for event registrants"
                  />
                </div>
              )}
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
                    checked={channelTelegram}
                    onChange={(e) => setChannelTelegram(e.target.checked)}
                  />
                  Telegram
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={channelSms}
                    onChange={(e) => setChannelSms(e.target.checked)}
                  />
                  SMS
                </label>
              </fieldset>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="scheduledAt">Schedule (optional)</Label>
                  <Input
                    id="scheduledAt"
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Recurrence</Label>
                  <Select value={recurrenceRule} onValueChange={setRecurrenceRule}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {recurrenceRule === 'weekly' ? (
                <div className="space-y-2">
                  <Label htmlFor="recurrenceUntil">Repeat until</Label>
                  <Input
                    id="recurrenceUntil"
                    type="datetime-local"
                    value={recurrenceUntil}
                    onChange={(e) => setRecurrenceUntil(e.target.value)}
                  />
                </div>
              ) : null}
              {isBulk ? (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={bulkConfirm}
                    onChange={(e) => setBulkConfirm(e.target.checked)}
                  />
                  I confirm this bulk send
                </label>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" onClick={() => void onPreview()} disabled={previewing}>
                  {previewing ? 'Previewing…' : 'Preview audience'}
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Queueing…' : 'Queue send'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {preview ? (
          <Card>
            <CardHeader>
              <CardTitle>Audience preview</CardTitle>
              <CardDescription>Counts only — no recipient PII.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
              <p>Recipients: {preview.recipientCount}</p>
              <p>In-app: {preview.channels.in_app}</p>
              <p>Email: {preview.channels.email}</p>
              <p>Telegram: {preview.channels.telegram}</p>
              <p>SMS: {preview.channels.sms}</p>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </PermissionGate>
  );
}
