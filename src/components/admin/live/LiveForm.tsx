'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { apiGet, apiPost } from '@/lib/api/client';
import { useAuth } from '@/components/providers/AuthProvider';
import { PageHeader } from '@/components/admin/PageHeader';
import { PermissionGate } from '@/components/admin/PermissionGate';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { publicErrorMessage } from '@/lib/admin/http-error';

interface EventOption {
  id: string;
  title: string;
  slug: string;
  startAt: string;
}

const TIMEZONES = ['Africa/Addis_Ababa', 'Africa/Nairobi', 'UTC', 'America/New_York'];

export function LiveForm() {
  const router = useRouter();
  const { can } = useAuth();
  const [events, setEvents] = useState<EventOption[]>([]);
  const [saving, setSaving] = useState(false);
  const form = useForm({
    defaultValues: {
      eventId: '',
      title: '',
      description: '',
      provider: 'youtube',
      streamUrl: '',
      visibility: 'public',
      chatEnabled: true,
      prayerEnabled: true,
      attendanceEnabled: true,
      reactionsEnabled: true,
      pollsEnabled: false,
      scheduledStartAt: '',
      scheduledEndAt: '',
      timezone: 'Africa/Addis_Ababa',
    },
  });

  useEffect(() => {
    void apiGet<EventOption[]>('/admin/events', {
      page: '1',
      pageSize: '50',
      sort: 'startAt',
      dir: 'asc',
    }).then((result) => {
      if (result.success && result.data) setEvents(result.data);
    });
  }, []);

  async function onSubmit(values: typeof form.formState.defaultValues) {
    if (!values.eventId) {
      toast.error('Select an event for this live session.');
      return;
    }
    setSaving(true);
    const payload = {
      eventId: values.eventId,
      title: values.title || undefined,
      description: values.description || null,
      provider: values.provider,
      streamUrl: values.streamUrl || undefined,
      visibility: values.visibility,
      chatEnabled: values.chatEnabled,
      prayerEnabled: values.prayerEnabled,
      attendanceEnabled: values.attendanceEnabled,
      reactionsEnabled: values.reactionsEnabled,
      pollsEnabled: values.pollsEnabled,
      scheduledStartAt: values.scheduledStartAt || undefined,
      scheduledEndAt: values.scheduledEndAt || null,
      timezone: values.timezone,
    };
    const result = await apiPost<{ id: string }>('/admin/live', payload);
    setSaving(false);
    if (!result.success || !result.data) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    toast.success(result.message || 'Live session created.');
    router.push(`/admin/live/${result.data.id}`);
  }

  const canCreate = can('events.create') || can('events.manage');

  return (
    <PermissionGate permission="events.create">
      <div className="mx-auto max-w-2xl space-y-6">
        <PageHeader
          title="Create live session"
          description="Link a worship event to a live stream provider and schedule."
          actions={
            <Button asChild variant="outline">
              <Link href="/admin/live">Back to live</Link>
            </Button>
          }
        />

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="eventId">Event *</Label>
            <Select
              value={form.watch('eventId')}
              onValueChange={(value) => {
                form.setValue('eventId', value);
                const event = events.find((item) => item.id === value);
                if (event && !form.getValues('title')) {
                  form.setValue('title', event.title);
                }
              }}
            >
              <SelectTrigger id="eventId">
                <SelectValue placeholder="Select event" />
              </SelectTrigger>
              <SelectContent>
                {events.map((event) => (
                  <SelectItem key={event.id} value={event.id}>
                    {event.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Session title</Label>
            <Input id="title" {...form.register('title')} placeholder="Sunday Worship Live" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={3} {...form.register('description')} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="provider">Provider</Label>
              <Select
                value={form.watch('provider')}
                onValueChange={(value) => form.setValue('provider', value)}
              >
                <SelectTrigger id="provider">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="youtube">YouTube</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="external">External embed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="visibility">Visibility</Label>
              <Select
                value={form.watch('visibility')}
                onValueChange={(value) => form.setValue('visibility', value)}
              >
                <SelectTrigger id="visibility">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="members">Members only</SelectItem>
                  <SelectItem value="private">Private (staff)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="streamUrl">Stream URL *</Label>
            <Input
              id="streamUrl"
              {...form.register('streamUrl')}
              placeholder="https://www.youtube.com/watch?v=..."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="scheduledStartAt">Scheduled start</Label>
              <Input id="scheduledStartAt" type="datetime-local" {...form.register('scheduledStartAt')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="scheduledEndAt">Scheduled end</Label>
              <Input id="scheduledEndAt" type="datetime-local" {...form.register('scheduledEndAt')} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Select
              value={form.watch('timezone')}
              onValueChange={(value) => form.setValue('timezone', value)}
            >
              <SelectTrigger id="timezone">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {(
              [
                ['chatEnabled', 'Enable chat'],
                ['prayerEnabled', 'Enable prayer requests'],
                ['attendanceEnabled', 'Enable attendance check-in'],
                ['reactionsEnabled', 'Enable reactions'],
                ['pollsEnabled', 'Enable polls'],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between rounded-md border p-3">
                <Label htmlFor={key}>{label}</Label>
                <Switch
                  id={key}
                  checked={form.watch(key)}
                  onCheckedChange={(checked) => form.setValue(key, checked)}
                />
              </div>
            ))}
          </div>

          <Button type="submit" disabled={saving || !canCreate}>
            {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Create live session
          </Button>
        </form>
      </div>
    </PermissionGate>
  );
}
