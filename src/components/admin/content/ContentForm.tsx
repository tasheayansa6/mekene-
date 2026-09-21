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
import type { ContentKind } from './ContentTable';

interface Option {
  id: string;
  name: string;
}

function toLocalInput(iso?: string | null) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromLocalInput(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

const KIND_LABEL: Record<ContentKind, string> = {
  pages: 'page',
  news: 'article',
  announcements: 'announcement',
  resources: 'resource',
};

export function ContentForm({ kind, id }: { kind: ContentKind; id?: string }) {
  const router = useRouter();
  const { can } = useAuth();
  const canPublish = can('content.publish');
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [content, setContent] = useState('');
  const [categories, setCategories] = useState<Option[]>([]);
  const [tags, setTags] = useState<Option[]>([]);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const form = useForm({
    defaultValues: {
      title: '',
      slug: '',
      excerpt: '',
      description: '',
      featuredImageUrl: '',
      featuredImageAlt: '',
      thumbnailUrl: '',
      thumbnailAlt: '',
      fileUrl: '',
      fileName: '',
      fileMime: '',
      fileSize: '',
      externalUrl: '',
      seoTitle: '',
      seoDescription: '',
      ogImageUrl: '',
      status: 'draft',
      isFeatured: false,
      sortOrder: '0',
      categoryId: 'none',
      priority: 'normal',
      startAt: toLocalInput(new Date().toISOString()),
      endAt: '',
      publishAt: '',
    },
  });

  useEffect(() => {
    const scope = kind === 'resources' ? 'resource' : 'news';
    if (kind === 'news' || kind === 'resources') {
      void apiGet<Option[]>(`/admin/content/categories`, { scope }).then((result) => {
        setCategories(result.data || []);
      });
    }
    if (kind === 'news') {
      void apiGet<Option[]>('/admin/content/tags').then((result) => setTags(result.data || []));
    }
    if (!id) return;
    void apiGet<Record<string, unknown>>(`/admin/content/${kind}/${id}`).then((result) => {
      if (!result.success || !result.data) return;
      const row = result.data;
      form.reset({
        title: String(row.title || ''),
        slug: String(row.slug || ''),
        excerpt: String(row.excerpt || ''),
        description: String(row.description || ''),
        featuredImageUrl: String(row.featuredImageUrl || ''),
        featuredImageAlt: String(row.featuredImageAlt || ''),
        thumbnailUrl: String(row.thumbnailUrl || ''),
        thumbnailAlt: String(row.thumbnailAlt || ''),
        fileUrl: String(row.fileUrl || ''),
        fileName: String(row.fileName || ''),
        fileMime: String(row.fileMime || ''),
        fileSize: row.fileSize != null ? String(row.fileSize) : '',
        externalUrl: String(row.externalUrl || ''),
        seoTitle: String(row.seoTitle || ''),
        seoDescription: String(row.seoDescription || ''),
        ogImageUrl: String(row.ogImageUrl || ''),
        status: String(row.status || 'draft'),
        isFeatured: Boolean(row.isFeatured),
        sortOrder: String(row.sortOrder ?? 0),
        categoryId: String(row.categoryId || 'none'),
        priority: String(row.priority || 'normal'),
        startAt: toLocalInput(row.startAt as string | null),
        endAt: toLocalInput(row.endAt as string | null),
        publishAt: toLocalInput(row.publishAt as string | null),
      });
      setContent(String(row.content || ''));
      setTagIds((row.tagIds as string[]) || []);
      setDirty(false);
    });
  }, [id, kind, form]);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  async function uploadFile(file: File, uploadKind: 'image' | 'resource' | 'thumbnail') {
    setUploading(true);
    const csrf = getCsrfToken() || (await ensureCsrfToken());
    const body = new FormData();
    body.set('file', file);
    body.set('kind', uploadKind);
    const response = await fetch('/api/v1/admin/content/uploads', {
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
    return json.data as { url?: string; fileUrl?: string; fileName?: string; fileMime?: string; fileSize?: number };
  }

  async function onSubmit(values: Record<string, string | boolean>) {
    setSaving(true);
    const payload: Record<string, unknown> = {
      title: values.title,
      slug: values.slug || undefined,
      status: values.status,
      isFeatured: values.isFeatured,
      seoTitle: values.seoTitle || null,
      seoDescription: values.seoDescription || null,
      publishAt: fromLocalInput(String(values.publishAt || '')),
    };

    if (kind === 'announcements') {
      payload.excerpt = values.excerpt;
      payload.content = content;
      payload.priority = values.priority;
      payload.startAt = fromLocalInput(String(values.startAt));
      payload.endAt = fromLocalInput(String(values.endAt));
      payload.featuredImageUrl = values.featuredImageUrl || null;
      payload.featuredImageAlt = values.featuredImageAlt || null;
    } else if (kind === 'resources') {
      payload.description = values.description || null;
      payload.content = content || null;
      payload.fileUrl = values.fileUrl || null;
      payload.fileName = values.fileName || null;
      payload.fileMime = values.fileMime || null;
      payload.fileSize = values.fileSize ? Number(values.fileSize) : null;
      payload.thumbnailUrl = values.thumbnailUrl || null;
      payload.thumbnailAlt = values.thumbnailAlt || null;
      payload.externalUrl = values.externalUrl || null;
      payload.categoryId = values.categoryId === 'none' ? null : values.categoryId;
    } else {
      payload.excerpt = values.excerpt || null;
      payload.content = content;
      payload.featuredImageUrl = values.featuredImageUrl || null;
      payload.featuredImageAlt = values.featuredImageAlt || null;
      payload.ogImageUrl = values.ogImageUrl || null;
      if (kind === 'pages') payload.sortOrder = Number(values.sortOrder || 0);
      if (kind === 'news') {
        payload.categoryId = values.categoryId === 'none' ? null : values.categoryId;
        payload.tagIds = tagIds;
      }
    }

    const result = id
      ? await apiPatch(`/admin/content/${kind}/${id}`, payload)
      : await apiPost(`/admin/content/${kind}`, payload);
    setSaving(false);
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message) || 'Unable to save content.');
      return;
    }
    setDirty(false);
    toast.success(id ? 'Content saved.' : 'Draft created.');
    const saved = result.data as { id?: string } | null;
    router.push(id ? `/admin/content/${kind}` : `/admin/content/${kind}/${saved?.id || ''}`);
  }

  async function archive() {
    if (!id) return;
    setSaving(true);
    const result = await fetch(`/api/v1/admin/content/${kind}/${id}`, {
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
    toast.success('Content archived.');
    router.push(`/admin/content/${kind}`);
  }

  const label = KIND_LABEL[kind];

  return (
    <PermissionGate permission={id ? 'content.update' : 'content.create'}>
      <div className="space-y-6">
        <PageHeader
          title={id ? `Edit ${label}` : `Create ${label}`}
          description="Content is saved as a draft unless you have publish permission and choose Published or Scheduled."
          actions={
            <div className="flex flex-wrap gap-2">
              {id ? (
                <Button asChild variant="outline">
                  <Link href={`/admin/content/${kind}/${id}/preview`}>Preview</Link>
                </Button>
              ) : null}
              <Button asChild variant="ghost">
                <Link href={`/admin/content/${kind}`}>Back</Link>
              </Button>
            </div>
          }
        />
        <form
          className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]"
          onSubmit={form.handleSubmit(onSubmit)}
          onChange={() => setDirty(true)}
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" {...form.register('title', { required: true })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input id="slug" {...form.register('slug')} placeholder="generated-from-title" />
            </div>
            {kind === 'resources' ? (
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" rows={3} {...form.register('description')} />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="excerpt">{kind === 'announcements' ? 'Short message' : 'Excerpt'}</Label>
                <Textarea id="excerpt" rows={3} {...form.register('excerpt')} />
              </div>
            )}
            <MarkdownEditor
              id="content"
              label="Content"
              value={content}
              onChange={(value) => {
                setContent(value);
                setDirty(true);
              }}
            />
            {kind !== 'resources' ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="featuredImageUrl">Featured image URL</Label>
                  <Input id="featuredImageUrl" {...form.register('featuredImageUrl')} />
                  <Input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    aria-label="Upload featured image"
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      const saved = await uploadFile(file, 'image');
                      if (saved?.url) form.setValue('featuredImageUrl', saved.url);
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="featuredImageAlt">Image alt text</Label>
                  <Input id="featuredImageAlt" {...form.register('featuredImageAlt')} />
                </div>
              </div>
            ) : (
              <div className="space-y-4 rounded-md border p-4">
                <p className="text-sm font-medium">Downloadable file</p>
                <Input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,application/pdf"
                  aria-label="Upload resource file"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    const saved = await uploadFile(file, 'resource');
                    if (!saved?.fileUrl) return;
                    form.setValue('fileUrl', saved.fileUrl);
                    form.setValue('fileName', saved.fileName || file.name);
                    form.setValue('fileMime', saved.fileMime || file.type);
                    form.setValue('fileSize', String(saved.fileSize || file.size));
                    setDirty(true);
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  {form.watch('fileName') || 'PDF, Word, or text files up to 15MB.'}
                </p>
                <div className="space-y-2">
                  <Label htmlFor="externalUrl">External URL (optional)</Label>
                  <Input id="externalUrl" {...form.register('externalUrl')} />
                </div>
              </div>
            )}
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
                  {can('content.archive') ? <SelectItem value="archived">Archived</SelectItem> : null}
                </SelectContent>
              </Select>
              <div className="space-y-2">
                <Label htmlFor="publishAt">Publish at</Label>
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
            {kind === 'announcements' ? (
              <div className="space-y-2 rounded-md border p-4">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={form.watch('priority')}
                  onValueChange={(value) => form.setValue('priority', value)}
                >
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="important">Important</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
                <Label htmlFor="startAt">Start</Label>
                <Input id="startAt" type="datetime-local" {...form.register('startAt')} />
                <Label htmlFor="endAt">End (optional)</Label>
                <Input id="endAt" type="datetime-local" {...form.register('endAt')} />
              </div>
            ) : null}
            {kind === 'news' || kind === 'resources' ? (
              <div className="space-y-2 rounded-md border p-4">
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
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {kind === 'news' ? (
                  <fieldset className="space-y-2">
                    <legend className="text-sm font-medium">Tags</legend>
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => {
                        const checked = tagIds.includes(tag.id);
                        return (
                          <label key={tag.id} className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                setTagIds((current) =>
                                  checked ? current.filter((id) => id !== tag.id) : [...current, tag.id]
                                );
                                setDirty(true);
                              }}
                            />
                            {tag.name}
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>
                ) : null}
              </div>
            ) : null}
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
              {id && can('content.archive') ? (
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
          title="Archive this content?"
          description="It will be hidden from the public website and kept for church records. Published pages should not be permanently deleted from this screen."
          confirmLabel="Archive"
          destructive
          loading={saving}
          onConfirm={archive}
        />
      </div>
    </PermissionGate>
  );
}
