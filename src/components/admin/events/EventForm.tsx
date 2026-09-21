'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { apiGet, apiPatch, apiPost } from '@/lib/api/client';
import { ensureCsrfToken, getCsrfToken } from '@/lib/api/client';
import { CSRF_HEADER_NAME } from '@/lib/auth/config';
import { useAuth } from '@/components/providers/AuthProvider';
import { PermissionGate } from '@/components/admin/PermissionGate';
import { PageHeader } from '@/components/admin/PageHeader';
import { MarkdownEditor } from '@/components/admin/content/MarkdownEditor';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
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
import { toZonedLocalInput } from '@/lib/events/timezone';

interface Option {
  id: string;
  name: string;
}

const TIMEZONES = [
  'Africa/Addis_Ababa',
  'Africa/Nairobi',
  'UTC',
  'Europe/London',
  'America/New_York',
];

export function EventForm({ id }: { id?: string }) {
  const router = useRouter();
  const { can } = useAuth();
  const canPublish = can('events.publish');
  const canCancel = can('events.cancel');
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [description, setDescription] = useState('');
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [unpublishOpen, setUnpublishOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [categories, setCategories] = useState<Option[]>([]);
  const [locations, setLocations] = useState<Option[]>([]);
  const [ministries, setMinistries] = useState<Option[]>([]);
  const [leaders, setLeaders] = useState<Option[]>([]);
  const [assignedMinistryId, setAssignedMinistryId] = useState<string | null>(null);
  const form = useForm({
    defaultValues: {
      title: '',
      slug: '',
      shortDescription: '',
      categoryId: 'none',
      ministryId: 'none',
      organizerLeaderId: 'none',
      organizerName: '',
      locationId: 'none',
      isOnline: false,
      meetingUrl: '',
      startAt: '',
      endAt: '',
      timezone: 'Africa/Addis_Ababa',
      recurrence: 'none',
      recurrenceInterval: '1',
      recurrenceUntil: '',
      featuredImageUrl: '',
      featuredImageAlt: '',
      registrationRequired: false,
      registrationUrl: '',
      capacity: '',
      allowOverVenueCapacity: false,
      isWorshipService: false,
      serviceLabel: '',
      registrationDeadline: '',
      seoTitle: '',
      seoDescription: '',
      ogImageUrl: '',
      status: 'draft',
      isFeatured: false,
      publishAt: '',
    },
  });

  useEffect(() => {
    void apiGet<{
      categories: Option[];
      locations: Option[];
      ministries: Option[];
      leaders: Option[];
      assignedMinistryId: string | null;
      defaultTimezone: string;
    }>('/admin/events/options').then((result) => {
      if (!result.data) return;
      setCategories(result.data.categories || []);
      setLocations(result.data.locations || []);
      setMinistries(result.data.ministries || []);
      setLeaders(result.data.leaders || []);
      setAssignedMinistryId(result.data.assignedMinistryId);
      if (!id && result.data.defaultTimezone) {
        form.setValue('timezone', result.data.defaultTimezone);
      }
      if (!id && result.data.assignedMinistryId) {
        form.setValue('ministryId', result.data.assignedMinistryId);
      }
    });
    if (!id) return;
    void apiGet<Record<string, unknown>>(`/admin/events/${id}`).then((result) => {
      if (!result.success || !result.data) return;
      const row = result.data;
      const zone = String(row.timezone || 'Africa/Addis_Ababa');
      form.reset({
        title: String(row.title || ''),
        slug: String(row.slug || ''),
        shortDescription: String(row.shortDescription || ''),
        categoryId: String(row.categoryId || 'none'),
        ministryId: String(row.ministryId || 'none'),
        organizerLeaderId: String(row.organizerLeaderId || 'none'),
        organizerName: String(row.organizerName && !row.organizerLeaderId ? row.organizerName : ''),
        locationId: String(row.locationId || 'none'),
        isOnline: Boolean(row.isOnline),
        meetingUrl: String(row.meetingUrl || ''),
        startAt: toZonedLocalInput(new Date(String(row.startAt)), zone),
        endAt: toZonedLocalInput(new Date(String(row.endAt)), zone),
        timezone: zone,
        recurrence: String(row.recurrence || 'none'),
        recurrenceInterval: String(row.recurrenceInterval || 1),
        recurrenceUntil: row.recurrenceUntil
          ? toZonedLocalInput(new Date(String(row.recurrenceUntil)), zone)
          : '',
        featuredImageUrl: String(row.featuredImageUrl || ''),
        featuredImageAlt: String(row.featuredImageAlt || ''),
        registrationRequired: Boolean(row.registrationRequired),
        registrationUrl: String(row.registrationUrl || ''),
        capacity: row.capacity != null ? String(row.capacity) : '',
        allowOverVenueCapacity: Boolean((row as { allowOverVenueCapacity?: boolean }).allowOverVenueCapacity),
        isWorshipService: Boolean((row as { isWorshipService?: boolean }).isWorshipService),
        serviceLabel: String((row as { serviceLabel?: string }).serviceLabel || ''),
        registrationDeadline: row.registrationDeadline
          ? toZonedLocalInput(new Date(String(row.registrationDeadline)), zone)
          : '',
        seoTitle: String(row.seoTitle || ''),
        seoDescription: String(row.seoDescription || ''),
        ogImageUrl: String((row as { ogImageUrl?: string }).ogImageUrl || ''),
        status: String(row.status || 'draft'),
        isFeatured: Boolean(row.isFeatured),
        publishAt: row.publishAt ? toZonedLocalInput(new Date(String(row.publishAt)), zone) : '',
      });
      setDescription(String(row.description || ''));
      setDirty(false);
    });
  }, [id, form]);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  async function uploadFile(file: File) {
    setUploading(true);
    const csrf = getCsrfToken() || (await ensureCsrfToken());
    const body = new FormData();
    body.set('file', file);
    body.set('kind', 'image');
    const response = await fetch('/api/v1/admin/events/uploads', {
      method: 'POST',
      credentials: 'include',
      headers: csrf ? { [CSRF_HEADER_NAME]: csrf } : undefined,
      body,
    });
    const json = await response.json();
    setUploading(false);
    if (!json.success) {
      toast.error(publicErrorMessage(response.status, json.message));
      return null;
    }
    return json.data as { url?: string };
  }

  async function onSubmit(values: Record<string, string | boolean>) {
    setSaving(true);
    const payload: Record<string, unknown> = {
      title: values.title,
      slug: values.slug || undefined,
      description: description || null,
      shortDescription: values.shortDescription || null,
      categoryId: values.categoryId === 'none' ? null : values.categoryId,
      ministryId: assignedMinistryId || (values.ministryId === 'none' ? null : values.ministryId),
      organizerLeaderId: values.organizerLeaderId === 'none' ? null : values.organizerLeaderId,
      organizerName: values.organizerLeaderId === 'none' ? values.organizerName || null : null,
      locationId: values.locationId === 'none' ? null : values.locationId,
      isOnline: values.isOnline,
      meetingUrl: values.meetingUrl || null,
      startAt: values.startAt,
      endAt: values.endAt,
      timezone: values.timezone,
      recurrence: values.recurrence,
      recurrenceInterval: Number(values.recurrenceInterval || 1),
      recurrenceUntil: values.recurrenceUntil || null,
      featuredImageUrl: values.featuredImageUrl || null,
      featuredImageAlt: values.featuredImageAlt || null,
      registrationRequired: values.registrationRequired,
      registrationUrl: values.registrationUrl || null,
      capacity: values.capacity ? Number(values.capacity) : null,
      allowOverVenueCapacity: values.allowOverVenueCapacity,
      isWorshipService: values.isWorshipService,
      serviceLabel: values.isWorshipService ? values.serviceLabel || null : null,
      registrationDeadline: values.registrationDeadline || null,
      status: values.status,
      isFeatured: values.isFeatured,
      seoTitle: values.seoTitle || null,
      seoDescription: values.seoDescription || null,
      ogImageUrl: values.ogImageUrl || null,
      publishAt: values.publishAt || null,
    };
    const result = id
      ? await apiPatch(`/admin/events/${id}`, payload)
      : await apiPost('/admin/events', payload);
    setSaving(false);
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message) || 'Unable to save event.');
      return;
    }
    setDirty(false);
    toast.success(id ? 'Event saved.' : 'Event created as a draft unless you published it.');
    const saved = result.data as { id?: string } | null;
    router.push(id ? '/admin/events' : `/admin/events/${saved?.id || ''}`);
  }

  async function archive() {
    if (!id) return;
    setSaving(true);
    const result = await fetch(`/api/v1/admin/events/${id}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        [CSRF_HEADER_NAME]: getCsrfToken() || (await ensureCsrfToken()),
      },
    }).then((res) => res.json());
    setSaving(false);
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    toast.success('Event archived.');
    router.push('/admin/events');
  }

  async function patchStatus(status: string, successMessage: string) {
    if (!id) return;
    setSaving(true);
    const result = await apiPatch(`/admin/events/${id}`, { status });
    setSaving(false);
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    form.setValue('status', status);
    toast.success(successMessage);
    setCancelOpen(false);
    setUnpublishOpen(false);
  }

  const timezones = TIMEZONES.includes(form.watch('timezone'))
    ? TIMEZONES
    : [form.watch('timezone'), ...TIMEZONES];

  return (
    <PermissionGate permission={id ? 'events.update' : 'events.create'}>
      <div className="space-y-6">
        <PageHeader
          title={id ? 'Edit event' : 'Add event'}
          description="New events stay in draft until someone with publish permission publishes them. Do not invent official church events."
          actions={
            <div className="flex flex-wrap gap-2">
              {id ? (
                <>
                  <Button asChild variant="outline">
                    <Link href={`/admin/events/${id}/registrations`}>Registrations</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href={`/admin/events/${id}/preview`}>Preview</Link>
                  </Button>
                </>
              ) : null}
              <Button asChild variant="ghost">
                <Link href="/admin/events">Back</Link>
              </Button>
            </div>
          }
        />
        <form
          className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]"
          onSubmit={form.handleSubmit(onSubmit)}
          onChange={() => setDirty(true)}
        >
          <div className="space-y-6">
            <fieldset className="space-y-4 rounded-md border p-4">
              <legend className="px-1 text-sm font-semibold">Basic information</legend>
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" {...form.register('title', { required: true })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input id="slug" {...form.register('slug')} placeholder="generated-from-title" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shortDescription">Short description</Label>
                <Textarea id="shortDescription" rows={2} {...form.register('shortDescription')} />
              </div>
              <MarkdownEditor
                id="description"
                label="Description"
                value={description}
                onChange={(value) => {
                  setDescription(value);
                  setDirty(true);
                }}
              />
              <div className="space-y-2">
                <Label htmlFor="categoryId">Category / type</Label>
                <Select
                  value={form.watch('categoryId')}
                  onValueChange={(value) => {
                    form.setValue('categoryId', value);
                    setDirty(true);
                  }}
                >
                  <SelectTrigger id="categoryId">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {categories.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </fieldset>

            <fieldset className="space-y-4 rounded-md border p-4">
              <legend className="px-1 text-sm font-semibold">Schedule</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="startAt">Start</Label>
                  <Input id="startAt" type="datetime-local" {...form.register('startAt', { required: true })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endAt">End</Label>
                  <Input id="endAt" type="datetime-local" {...form.register('endAt', { required: true })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select
                    value={form.watch('timezone')}
                    onValueChange={(value) => {
                      form.setValue('timezone', value);
                      setDirty(true);
                    }}
                  >
                    <SelectTrigger id="timezone">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timezones.map((zone) => (
                        <SelectItem key={zone} value={zone}>
                          {zone.replace(/_/g, ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="recurrence">Recurring</Label>
                  <Select
                    value={form.watch('recurrence')}
                    onValueChange={(value) => {
                      form.setValue('recurrence', value);
                      setDirty(true);
                    }}
                  >
                    <SelectTrigger id="recurrence">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Does not repeat</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.watch('recurrence') !== 'none' ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="recurrenceInterval">Every</Label>
                      <Input
                        id="recurrenceInterval"
                        type="number"
                        min={1}
                        max={12}
                        {...form.register('recurrenceInterval')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="recurrenceUntil">Until</Label>
                      <Input id="recurrenceUntil" type="datetime-local" {...form.register('recurrenceUntil')} />
                    </div>
                  </>
                ) : null}
              </div>
            </fieldset>

            <fieldset className="space-y-4 rounded-md border p-4">
              <legend className="px-1 text-sm font-semibold">Organization</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="ministryId">Ministry</Label>
                  <Select
                    value={form.watch('ministryId')}
                    onValueChange={(value) => {
                      form.setValue('ministryId', value);
                      setDirty(true);
                    }}
                    disabled={Boolean(assignedMinistryId)}
                  >
                    <SelectTrigger id="ministryId">
                      <SelectValue placeholder="Ministry" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Church-wide</SelectItem>
                      {ministries.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="organizerLeaderId">Organizer (church leader)</Label>
                  <Select
                    value={form.watch('organizerLeaderId')}
                    onValueChange={(value) => {
                      form.setValue('organizerLeaderId', value);
                      setDirty(true);
                    }}
                  >
                    <SelectTrigger id="organizerLeaderId">
                      <SelectValue placeholder="Organizer" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Named organizer / church</SelectItem>
                      {leaders.map((person) => (
                        <SelectItem key={person.id} value={person.id}>
                          {person.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="organizerName">Organizer name</Label>
                  <Input
                    id="organizerName"
                    {...form.register('organizerName')}
                    disabled={form.watch('organizerLeaderId') !== 'none'}
                  />
                </div>
              </div>
            </fieldset>

            <fieldset className="space-y-4 rounded-md border p-4">
              <legend className="px-1 text-sm font-semibold">Worship service</legend>
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="isWorshipService">This is a worship service</Label>
                <Switch
                  id="isWorshipService"
                  checked={form.watch('isWorshipService')}
                  onCheckedChange={(checked) => {
                    form.setValue('isWorshipService', checked);
                    setDirty(true);
                  }}
                />
              </div>
              {form.watch('isWorshipService') ? (
                <div className="space-y-2">
                  <Label htmlFor="serviceLabel">Service label</Label>
                  <Input
                    id="serviceLabel"
                    placeholder="Sunday Morning, Midweek Prayer, etc."
                    {...form.register('serviceLabel')}
                  />
                </div>
              ) : null}
              {id ? (
                <p className="text-sm text-muted-foreground">
                  Build the order of service on the{' '}
                  <Link className="underline" href={`/admin/events/${id}/program`}>
                    Program
                  </Link>{' '}
                  tab.
                </p>
              ) : null}
            </fieldset>

            <fieldset className="space-y-4 rounded-md border p-4">
              <legend className="px-1 text-sm font-semibold">Location</legend>
              <div className="space-y-2">
                <Label htmlFor="locationId">Venue</Label>
                <Select
                  value={form.watch('locationId')}
                  onValueChange={(value) => {
                    form.setValue('locationId', value);
                    setDirty(true);
                  }}
                >
                  <SelectTrigger id="locationId">
                    <SelectValue placeholder="Location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {locations.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="isOnline">Online event</Label>
                <Switch
                  id="isOnline"
                  checked={form.watch('isOnline')}
                  onCheckedChange={(checked) => {
                    form.setValue('isOnline', checked);
                    setDirty(true);
                  }}
                />
              </div>
              {form.watch('isOnline') ? (
                <div className="space-y-2">
                  <Label htmlFor="meetingUrl">Meeting URL</Label>
                  <Input id="meetingUrl" {...form.register('meetingUrl')} placeholder="https://" />
                </div>
              ) : null}
            </fieldset>

            <fieldset className="space-y-4 rounded-md border p-4">
              <legend className="px-1 text-sm font-semibold">Registration</legend>
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="registrationRequired">Registration required</Label>
                <Switch
                  id="registrationRequired"
                  checked={form.watch('registrationRequired')}
                  onCheckedChange={(checked) => {
                    form.setValue('registrationRequired', checked);
                    setDirty(true);
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="registrationUrl">Registration URL</Label>
                <Input id="registrationUrl" {...form.register('registrationUrl')} placeholder="https://" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="capacity">Capacity</Label>
                  <Input id="capacity" type="number" min={1} {...form.register('capacity')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="registrationDeadline">Registration deadline</Label>
                  <Input id="registrationDeadline" type="datetime-local" {...form.register('registrationDeadline')} />
                </div>
              </div>
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="allowOverVenueCapacity">Allow capacity above venue limit</Label>
                <Switch
                  id="allowOverVenueCapacity"
                  checked={form.watch('allowOverVenueCapacity')}
                  onCheckedChange={(checked) => {
                    form.setValue('allowOverVenueCapacity', checked);
                    setDirty(true);
                  }}
                />
              </div>
            </fieldset>

            <fieldset className="space-y-4 rounded-md border p-4">
              <legend className="px-1 text-sm font-semibold">Media</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="featuredImageUrl">Featured image</Label>
                  <Input id="featuredImageUrl" {...form.register('featuredImageUrl')} />
                  <Input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    aria-label="Upload featured image"
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      const saved = await uploadFile(file);
                      if (saved?.url) {
                        form.setValue('featuredImageUrl', saved.url);
                        form.setValue('ogImageUrl', saved.url);
                        setDirty(true);
                      }
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="featuredImageAlt">Image alt text</Label>
                  <Input id="featuredImageAlt" {...form.register('featuredImageAlt')} />
                </div>
              </div>
            </fieldset>
          </div>

          <aside className="space-y-4">
            <div className="space-y-2 rounded-md border p-4">
              <Label htmlFor="status">Status</Label>
              <Select
                value={form.watch('status')}
                onValueChange={(value) => {
                  form.setValue('status', value);
                  setDirty(true);
                }}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                  {canPublish ? <SelectItem value="scheduled">Scheduled</SelectItem> : null}
                  {canPublish ? <SelectItem value="published">Published</SelectItem> : null}
                  {canCancel ? <SelectItem value="cancelled">Cancelled</SelectItem> : null}
                  {canPublish ? <SelectItem value="completed">Completed</SelectItem> : null}
                  {can('events.archive') ? <SelectItem value="archived">Archived</SelectItem> : null}
                </SelectContent>
              </Select>
              <div className="space-y-2">
                <Label htmlFor="publishAt">Publish date</Label>
                <Input id="publishAt" type="datetime-local" {...form.register('publishAt')} />
              </div>
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="isFeatured">Featured (max 3)</Label>
                <Switch
                  id="isFeatured"
                  checked={form.watch('isFeatured')}
                  onCheckedChange={(checked) => {
                    form.setValue('isFeatured', checked);
                    setDirty(true);
                  }}
                />
              </div>
            </div>
            <div className="space-y-2 rounded-md border p-4">
              <p className="text-sm font-medium">SEO</p>
              <Label htmlFor="seoTitle">SEO title</Label>
              <Input id="seoTitle" maxLength={70} {...form.register('seoTitle')} />
              <Label htmlFor="seoDescription">SEO description</Label>
              <Textarea id="seoDescription" maxLength={160} rows={3} {...form.register('seoDescription')} />
            </div>
            <div className="flex flex-col gap-2">
              <Button type="submit" disabled={saving || uploading}>
                {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                Save
              </Button>
              {id && canPublish ? (
                <Button type="button" variant="outline" onClick={() => setUnpublishOpen(true)}>
                  Unpublish
                </Button>
              ) : null}
              {id && canCancel ? (
                <Button type="button" variant="outline" onClick={() => setCancelOpen(true)}>
                  Cancel event
                </Button>
              ) : null}
              {id && can('events.archive') ? (
                <Button type="button" variant="outline" onClick={() => setArchiveOpen(true)}>
                  Archive
                </Button>
              ) : null}
            </div>
          </aside>
        </form>
        <ConfirmDialog
          open={archiveOpen}
          onOpenChange={setArchiveOpen}
          title="Archive this event?"
          description="It will leave upcoming public lists and remain in church records."
          confirmLabel="Archive"
          destructive
          loading={saving}
          onConfirm={archive}
        />
        <ConfirmDialog
          open={cancelOpen}
          onOpenChange={setCancelOpen}
          title="Cancel this event?"
          description="The public page will show CANCELLED. The event is not deleted."
          confirmLabel="Cancel event"
          destructive
          loading={saving}
          onConfirm={() => patchStatus('cancelled', 'Event cancelled.')}
        />
        <ConfirmDialog
          open={unpublishOpen}
          onOpenChange={setUnpublishOpen}
          title="Unpublish this event?"
          description="The event will return to draft and will no longer appear on the public website."
          confirmLabel="Unpublish"
          loading={saving}
          onConfirm={() => patchStatus('draft', 'Event unpublished.')}
        />
      </div>
    </PermissionGate>
  );
}
