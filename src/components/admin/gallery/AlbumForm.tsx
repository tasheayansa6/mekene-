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
import { AlbumMediaManager } from './AlbumMediaManager';

interface Option {
  id: string;
  name?: string;
  title?: string;
}

interface AlbumFormProps {
  id?: string;
}

export function AlbumForm({ id }: AlbumFormProps) {
  const router = useRouter();
  const { can } = useAuth();
  const form = useForm({
    defaultValues: {
      title: '',
      slug: '',
      description: '',
      categoryId: 'none',
      eventId: 'none',
      ministryId: 'none',
      albumDate: '',
      coverImageUrl: '',
      coverImageAlt: '',
      status: 'draft',
      isFeatured: false,
      seoTitle: '',
      seoDescription: '',
    },
  });
  const [options, setOptions] = useState<{
    categories: Option[];
    ministries: Option[];
    events: Option[];
  }>({ categories: [], ministries: [], events: [] });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const canPublish = can('gallery.publish');

  useEffect(() => {
    void apiGet<{ categories: Option[]; ministries: Option[]; events: Option[] }>('/admin/gallery/options').then(
      (result) => {
        if (result.data) setOptions(result.data);
      }
    );
    if (!id) return;
    void apiGet<Record<string, unknown>>(`/admin/gallery/albums/${id}`).then((result) => {
      const row = result.data;
      if (!row) return;
      form.reset({
        title: String(row.title || ''),
        slug: String(row.slug || ''),
        description: String(row.description || ''),
        categoryId: String((row.category as Option | null)?.id || 'none'),
        eventId: String((row.event as Option | null)?.id || 'none'),
        ministryId: String((row.ministry as Option | null)?.id || 'none'),
        albumDate: row.albumDate ? String(row.albumDate).slice(0, 10) : '',
        coverImageUrl: String(row.coverImageUrl || ''),
        coverImageAlt: String(row.coverImageAlt || ''),
        status: String(row.status || 'draft'),
        isFeatured: Boolean(row.isFeatured),
        seoTitle: String(row.seoTitle || ''),
        seoDescription: String(row.seoDescription || ''),
      });
    });
  }, [id]);

  async function uploadCover(file: File) {
    setUploading(true);
    const csrf = getCsrfToken() || (await ensureCsrfToken());
    const body = new FormData();
    body.set('file', file);
    const response = await fetch('/api/v1/admin/gallery/uploads', {
      method: 'POST',
      credentials: 'include',
      headers: csrf ? { [CSRF_HEADER_NAME]: csrf } : undefined,
      body,
    });
    const json = await response.json();
    setUploading(false);
    if (!json.success) {
      toast.error(publicErrorMessage(response.status, json.message));
      return;
    }
    const saved = json.data?.saved?.[0];
    if (saved?.url) {
      form.setValue('coverImageUrl', saved.url);
      if (!form.getValues('coverImageAlt')) form.setValue('coverImageAlt', form.getValues('title') || 'Album cover');
    }
  }

  async function onSubmit(values: Record<string, string | boolean>, statusOverride?: string) {
    setSaving(true);
    const payload = {
      title: values.title,
      slug: values.slug || undefined,
      description: values.description || null,
      categoryId: values.categoryId === 'none' ? null : values.categoryId,
      eventId: values.eventId === 'none' ? null : values.eventId,
      ministryId: values.ministryId === 'none' ? null : values.ministryId,
      albumDate: values.albumDate || null,
      coverImageUrl: values.coverImageUrl || null,
      coverImageAlt: values.coverImageAlt || null,
      status: statusOverride || values.status,
      isFeatured: Boolean(values.isFeatured),
      seoTitle: values.seoTitle || null,
      seoDescription: values.seoDescription || null,
    };
    const result = id
      ? await apiPatch(`/admin/gallery/albums/${id}`, payload)
      : await apiPost('/admin/gallery/albums', payload);
    setSaving(false);
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    toast.success(result.message || 'Saved.');
    setDirty(false);
    const savedId = (result.data as { id?: string } | null)?.id;
    if (!id && savedId) router.replace(`/admin/gallery/albums/${savedId}`);
  }

  return (
    <PermissionGate permission={id ? 'gallery.update' : 'gallery.create'}>
      <div className="space-y-6">
        <PageHeader
          title={id ? 'Edit album' : 'Create album'}
          description="New albums stay in draft. Uploaded photos are never published automatically."
          actions={
            <div className="flex flex-wrap gap-2">
              {id ? (
                <Button asChild variant="outline">
                  <Link href={`/admin/gallery/albums/${id}/preview`}>Preview</Link>
                </Button>
              ) : null}
              <Button asChild variant="ghost">
                <Link href="/admin/gallery">Back</Link>
              </Button>
            </div>
          }
        />
        <form
          className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]"
          onSubmit={form.handleSubmit((values) => onSubmit(values))}
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
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" rows={5} {...form.register('description')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="categoryId">Category</Label>
                <Select
                  value={form.watch('categoryId')}
                  onValueChange={(value) => form.setValue('categoryId', value)}
                >
                  <SelectTrigger id="categoryId">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {options.categories.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </fieldset>
            <fieldset className="space-y-4 rounded-md border p-4">
              <legend className="px-1 text-sm font-semibold">Relationships</legend>
              <div className="space-y-2">
                <Label htmlFor="eventId">Event</Label>
                <Select value={form.watch('eventId')} onValueChange={(value) => form.setValue('eventId', value)}>
                  <SelectTrigger id="eventId">
                    <SelectValue placeholder="Event" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {options.events.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ministryId">Ministry</Label>
                <Select
                  value={form.watch('ministryId')}
                  onValueChange={(value) => form.setValue('ministryId', value)}
                >
                  <SelectTrigger id="ministryId">
                    <SelectValue placeholder="Ministry" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {options.ministries.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </fieldset>
            <fieldset className="space-y-4 rounded-md border p-4">
              <legend className="px-1 text-sm font-semibold">Media</legend>
              <div className="space-y-2">
                <Label htmlFor="coverImageUrl">Cover image</Label>
                <Input id="coverImageUrl" {...form.register('coverImageUrl')} />
                <Input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  aria-label="Upload cover image"
                  disabled={uploading}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadCover(file);
                    event.target.value = '';
                  }}
                />
                {uploading ? <p className="text-sm text-muted-foreground">Uploading...</p> : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="coverImageAlt">Cover image alt text</Label>
                <Input id="coverImageAlt" {...form.register('coverImageAlt')} />
              </div>
            </fieldset>
            {id ? <AlbumMediaManager albumId={id} /> : null}
          </div>
          <aside className="space-y-4">
            <fieldset className="space-y-4 rounded-md border p-4">
              <legend className="px-1 text-sm font-semibold">Publishing</legend>
              <div className="space-y-2">
                <Label htmlFor="albumDate">Album date</Label>
                <Input id="albumDate" type="date" {...form.register('albumDate')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={form.watch('status')}
                  onValueChange={(value) => form.setValue('status', value)}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="review">Review</SelectItem>
                    {canPublish ? <SelectItem value="published">Published</SelectItem> : null}
                    {can('gallery.archive') ? <SelectItem value="archived">Archived</SelectItem> : null}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="isFeatured">Featured</Label>
                <Switch
                  id="isFeatured"
                  checked={Boolean(form.watch('isFeatured'))}
                  onCheckedChange={(checked) => form.setValue('isFeatured', checked)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="seoTitle">SEO title</Label>
                <Input id="seoTitle" maxLength={70} {...form.register('seoTitle')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="seoDescription">SEO description</Label>
                <Textarea id="seoDescription" rows={3} maxLength={160} {...form.register('seoDescription')} />
              </div>
              <div className="flex flex-col gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                  {canPublish && form.watch('status') === 'published' ? 'Publish' : 'Save draft'}
                </Button>
                {canPublish ? (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={saving}
                    onClick={() => form.handleSubmit((values) => onSubmit(values, 'published'))()}
                  >
                    Publish
                  </Button>
                ) : null}
                {id && can('gallery.archive') ? (
                  <Button type="button" variant="outline" onClick={() => setArchiveOpen(true)}>
                    Archive
                  </Button>
                ) : null}
              </div>
              {dirty ? <p className="text-xs text-muted-foreground">You have unsaved changes.</p> : null}
            </fieldset>
          </aside>
        </form>
        <ConfirmDialog
          open={archiveOpen}
          onOpenChange={setArchiveOpen}
          title="Archive this album?"
          description="Archived albums leave the public gallery and remain available to administrators."
          confirmLabel="Archive"
          destructive
          onConfirm={() => form.handleSubmit((values) => onSubmit(values, 'archived'))()}
        />
      </div>
    </PermissionGate>
  );
}
