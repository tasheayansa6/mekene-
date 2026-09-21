'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2 } from 'lucide-react';
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

interface Option {
  id: string;
  name: string;
}

interface ScriptureDraft {
  book: string;
  chapter: string;
  verseStart: string;
  verseEnd: string;
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

function emptyScripture(): ScriptureDraft {
  return { book: '', chapter: '', verseStart: '', verseEnd: '' };
}

export function SermonForm({ id }: { id?: string }) {
  const router = useRouter();
  const { can } = useAuth();
  const canPublish = can('sermons.publish');
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [unpublishOpen, setUnpublishOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [speakers, setSpeakers] = useState<Option[]>([]);
  const [series, setSeries] = useState<Option[]>([]);
  const [categories, setCategories] = useState<Option[]>([]);
  const [scriptures, setScriptures] = useState<ScriptureDraft[]>([emptyScripture()]);
  const form = useForm({
    defaultValues: {
      title: '',
      slug: '',
      speakerId: 'none',
      speakerName: '',
      seriesId: 'none',
      categoryId: 'none',
      sermonDate: toLocalInput(new Date().toISOString()),
      thumbnailUrl: '',
      thumbnailAlt: '',
      audioUrl: '',
      audioFileName: '',
      audioMime: '',
      audioSize: '',
      videoUrl: '',
      notesFileUrl: '',
      notesFileName: '',
      notesFileMime: '',
      notesFileSize: '',
      transcript: '',
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
      speakers: Option[];
      series: Option[];
      categories: Option[];
    }>('/admin/sermons/options').then((result) => {
      if (!result.data) return;
      setSpeakers(result.data.speakers || []);
      setSeries(result.data.series || []);
      setCategories(result.data.categories || []);
    });
    if (!id) return;
    void apiGet<Record<string, unknown>>(`/admin/sermons/${id}`).then((result) => {
      if (!result.success || !result.data) return;
      const row = result.data;
      form.reset({
        title: String(row.title || ''),
        slug: String(row.slug || ''),
        speakerId: String(row.speakerId || 'none'),
        speakerName: String(row.speakerName && !row.speakerId ? row.speakerName : ''),
        seriesId: String(row.seriesId || 'none'),
        categoryId: String(row.categoryId || 'none'),
        sermonDate: toLocalInput(row.sermonDate as string),
        thumbnailUrl: String(row.thumbnailUrl || ''),
        thumbnailAlt: String(row.thumbnailAlt || ''),
        audioUrl: String(row.audioUrl || ''),
        audioFileName: String(row.audioFileName || ''),
        audioMime: '',
        audioSize: '',
        videoUrl: String(row.videoUrl || ''),
        notesFileUrl: String(row.notesFileUrl || ''),
        notesFileName: String(row.notesFileName || ''),
        notesFileMime: '',
        notesFileSize: '',
        transcript: String(row.transcript || ''),
        seoTitle: String(row.seoTitle || ''),
        seoDescription: String(row.seoDescription || ''),
        ogImageUrl: String((row as { ogImageUrl?: string }).ogImageUrl || ''),
        status: String(row.status || 'draft'),
        isFeatured: Boolean(row.isFeatured),
        publishAt: toLocalInput(row.publishAt as string | null),
      });
      setDescription(String(row.description || ''));
      setNotes(String(row.notes || ''));
      const refs = (row.scriptures as Array<Record<string, unknown>>) || [];
      setScriptures(
        refs.length
          ? refs.map((item) => ({
              book: String(item.book || ''),
              chapter: item.chapter != null ? String(item.chapter) : '',
              verseStart: item.verseStart != null ? String(item.verseStart) : '',
              verseEnd: item.verseEnd != null ? String(item.verseEnd) : '',
            }))
          : [emptyScripture()]
      );
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

  async function uploadFile(file: File, kind: 'image' | 'audio' | 'notes') {
    setUploading(true);
    const csrf = getCsrfToken() || (await ensureCsrfToken());
    const body = new FormData();
    body.set('file', file);
    body.set('kind', kind);
    const response = await fetch('/api/v1/admin/sermons/uploads', {
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
    return json.data as {
      url?: string;
      fileUrl?: string;
      fileName?: string;
      fileMime?: string;
      fileSize?: number;
    };
  }

  async function onSubmit(values: Record<string, string | boolean>) {
    setSaving(true);
    const payload: Record<string, unknown> = {
      title: values.title,
      slug: values.slug || undefined,
      description: description || null,
      notes: notes || null,
      transcript: values.transcript || null,
      speakerId: values.speakerId === 'none' ? null : values.speakerId,
      speakerName: values.speakerId === 'none' ? values.speakerName || null : null,
      seriesId: values.seriesId === 'none' ? null : values.seriesId,
      categoryId: values.categoryId === 'none' ? null : values.categoryId,
      sermonDate: fromLocalInput(String(values.sermonDate)),
      thumbnailUrl: values.thumbnailUrl || null,
      thumbnailAlt: values.thumbnailAlt || null,
      audioUrl: values.audioUrl || null,
      audioFileName: values.audioFileName || null,
      audioMime: values.audioMime || null,
      audioSize: values.audioSize ? Number(values.audioSize) : null,
      videoUrl: values.videoUrl || null,
      notesFileUrl: values.notesFileUrl || null,
      notesFileName: values.notesFileName || null,
      notesFileMime: values.notesFileMime || null,
      notesFileSize: values.notesFileSize ? Number(values.notesFileSize) : null,
      status: values.status,
      isFeatured: values.isFeatured,
      seoTitle: values.seoTitle || null,
      seoDescription: values.seoDescription || null,
      ogImageUrl: values.ogImageUrl || null,
      publishAt: fromLocalInput(String(values.publishAt || '')),
      scriptures: scriptures
        .filter((item) => item.book.trim())
        .map((item, index) => ({
          book: item.book.trim(),
          chapter: item.chapter ? Number(item.chapter) : null,
          verseStart: item.verseStart ? Number(item.verseStart) : null,
          verseEnd: item.verseEnd ? Number(item.verseEnd) : null,
          sortOrder: index,
        })),
    };
    const result = id
      ? await apiPatch(`/admin/sermons/${id}`, payload)
      : await apiPost('/admin/sermons', payload);
    setSaving(false);
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message) || 'Unable to save sermon.');
      return;
    }
    setDirty(false);
    toast.success(id ? 'Sermon saved.' : 'Sermon created as a draft unless you published it.');
    const saved = result.data as { id?: string } | null;
    router.push(id ? '/admin/sermons' : `/admin/sermons/${saved?.id || ''}`);
  }

  async function archive() {
    if (!id) return;
    setSaving(true);
    const result = await fetch(`/api/v1/admin/sermons/${id}`, {
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
    toast.success('Sermon archived.');
    router.push('/admin/sermons');
  }

  async function unpublish() {
    if (!id) return;
    setSaving(true);
    const result = await apiPatch(`/admin/sermons/${id}`, { status: 'draft' });
    setSaving(false);
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    form.setValue('status', 'draft');
    toast.success('Sermon unpublished.');
    setUnpublishOpen(false);
  }

  return (
    <PermissionGate permission={id ? 'sermons.update' : 'sermons.create'}>
      <div className="space-y-6">
        <PageHeader
          title={id ? 'Edit sermon' : 'Add sermon'}
          description="New sermons stay in draft until someone with publish permission publishes them."
          actions={
            <div className="flex flex-wrap gap-2">
              {id ? (
                <Button asChild variant="outline">
                  <Link href={`/admin/sermons/${id}/preview`}>Preview</Link>
                </Button>
              ) : null}
              <Button asChild variant="ghost">
                <Link href="/admin/sermons">Back</Link>
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
              <legend className="px-1 text-sm font-semibold">Basics</legend>
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" {...form.register('title', { required: true })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input id="slug" {...form.register('slug')} placeholder="generated-from-title" />
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
            </fieldset>

            <fieldset className="space-y-4 rounded-md border p-4">
              <legend className="px-1 text-sm font-semibold">Speaker, series, and category</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="speakerId">Speaker (church leader)</Label>
                  <Select
                    value={form.watch('speakerId')}
                    onValueChange={(value) => {
                      form.setValue('speakerId', value);
                      setDirty(true);
                    }}
                  >
                    <SelectTrigger id="speakerId">
                      <SelectValue placeholder="Speaker" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Guest / not in leadership</SelectItem>
                      {speakers.map((person) => (
                        <SelectItem key={person.id} value={person.id}>
                          {person.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="speakerName">Guest speaker name</Label>
                  <Input
                    id="speakerName"
                    {...form.register('speakerName')}
                    disabled={form.watch('speakerId') !== 'none'}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="seriesId">Series</Label>
                  <Select
                    value={form.watch('seriesId')}
                    onValueChange={(value) => {
                      form.setValue('seriesId', value);
                      setDirty(true);
                    }}
                  >
                    <SelectTrigger id="seriesId">
                      <SelectValue placeholder="Series" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {series.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="categoryId">Category</Label>
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
              </div>
            </fieldset>

            <fieldset className="space-y-4 rounded-md border p-4">
              <legend className="px-1 text-sm font-semibold">Scripture references</legend>
              <p className="text-sm text-muted-foreground">
                Store references only. Do not paste Bible text unless the church provides it.
              </p>
              {scriptures.map((item, index) => (
                <div key={index} className="grid gap-3 sm:grid-cols-[1fr_5rem_5rem_5rem_auto]">
                  <div className="space-y-1">
                    <Label htmlFor={`book-${index}`}>Book</Label>
                    <Input
                      id={`book-${index}`}
                      value={item.book}
                      onChange={(event) => {
                        const next = [...scriptures];
                        next[index] = { ...item, book: event.target.value };
                        setScriptures(next);
                        setDirty(true);
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`chapter-${index}`}>Chapter</Label>
                    <Input
                      id={`chapter-${index}`}
                      inputMode="numeric"
                      value={item.chapter}
                      onChange={(event) => {
                        const next = [...scriptures];
                        next[index] = { ...item, chapter: event.target.value };
                        setScriptures(next);
                        setDirty(true);
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`verse-start-${index}`}>Start verse</Label>
                    <Input
                      id={`verse-start-${index}`}
                      inputMode="numeric"
                      value={item.verseStart}
                      onChange={(event) => {
                        const next = [...scriptures];
                        next[index] = { ...item, verseStart: event.target.value };
                        setScriptures(next);
                        setDirty(true);
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`verse-end-${index}`}>End verse</Label>
                    <Input
                      id={`verse-end-${index}`}
                      inputMode="numeric"
                      value={item.verseEnd}
                      onChange={(event) => {
                        const next = [...scriptures];
                        next[index] = { ...item, verseEnd: event.target.value };
                        setScriptures(next);
                        setDirty(true);
                      }}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    className="self-end"
                    aria-label="Remove scripture reference"
                    onClick={() => {
                      setScriptures(scriptures.filter((_, current) => current !== index));
                      setDirty(true);
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setScriptures([...scriptures, emptyScripture()]);
                  setDirty(true);
                }}
              >
                <Plus className="mr-2 size-4" />
                Add reference
              </Button>
            </fieldset>

            <fieldset className="space-y-4 rounded-md border p-4">
              <legend className="px-1 text-sm font-semibold">Media</legend>
              <div className="space-y-2">
                <Label htmlFor="sermonDate">Sermon date</Label>
                <Input id="sermonDate" type="datetime-local" {...form.register('sermonDate', { required: true })} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="thumbnailUrl">Thumbnail</Label>
                  <Input id="thumbnailUrl" {...form.register('thumbnailUrl')} />
                  <Input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    aria-label="Upload thumbnail"
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      const saved = await uploadFile(file, 'image');
                      if (saved?.url) {
                        form.setValue('thumbnailUrl', saved.url);
                        form.setValue('ogImageUrl', saved.url);
                        setDirty(true);
                      }
                    }}
                  />
                  {form.watch('thumbnailUrl') ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        form.setValue('thumbnailUrl', '');
                        form.setValue('thumbnailAlt', '');
                        setDirty(true);
                      }}
                    >
                      Remove thumbnail
                    </Button>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="thumbnailAlt">Thumbnail alt text</Label>
                  <Input id="thumbnailAlt" {...form.register('thumbnailAlt')} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="audio">Audio (MP3, M4A, or WAV, max 40MB)</Label>
                <Input
                  id="audio"
                  type="file"
                  accept="audio/mpeg,audio/mp4,audio/wav,audio/x-m4a,.mp3,.m4a,.wav"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    const saved = await uploadFile(file, 'audio');
                    if (!saved?.fileUrl) return;
                    form.setValue('audioUrl', saved.fileUrl);
                    form.setValue('audioFileName', saved.fileName || file.name);
                    form.setValue('audioMime', saved.fileMime || file.type);
                    form.setValue('audioSize', String(saved.fileSize || file.size));
                    setDirty(true);
                  }}
                />
                <p className="text-xs text-muted-foreground">{form.watch('audioFileName') || 'No audio uploaded.'}</p>
                {form.watch('audioUrl') ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      form.setValue('audioUrl', '');
                      form.setValue('audioFileName', '');
                      setDirty(true);
                    }}
                  >
                    Remove audio
                  </Button>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="videoUrl">Video URL (YouTube or Vimeo)</Label>
                <Input id="videoUrl" {...form.register('videoUrl')} placeholder="https://www.youtube.com/watch?v=" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes-file">Sermon notes file</Label>
                <Input
                  id="notes-file"
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,application/pdf"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    const saved = await uploadFile(file, 'notes');
                    if (!saved?.fileUrl) return;
                    form.setValue('notesFileUrl', saved.fileUrl);
                    form.setValue('notesFileName', saved.fileName || file.name);
                    form.setValue('notesFileMime', saved.fileMime || file.type);
                    form.setValue('notesFileSize', String(saved.fileSize || file.size));
                    setDirty(true);
                  }}
                />
                <p className="text-xs text-muted-foreground">{form.watch('notesFileName') || 'PDF, Word, or text up to 15MB.'}</p>
              </div>
              <MarkdownEditor
                id="notes"
                label="Sermon notes (text)"
                value={notes}
                onChange={(value) => {
                  setNotes(value);
                  setDirty(true);
                }}
              />
              <div className="space-y-2">
                <Label htmlFor="transcript">Transcript (optional, no AI generation in this phase)</Label>
                <Textarea id="transcript" rows={6} {...form.register('transcript')} />
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
                  {can('sermons.archive') ? <SelectItem value="archived">Archived</SelectItem> : null}
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
              {id && can('sermons.publish') ? (
                <Button type="button" variant="outline" onClick={() => setUnpublishOpen(true)}>
                  Unpublish
                </Button>
              ) : null}
              {id && can('sermons.archive') ? (
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
          title="Archive this sermon?"
          description="It will be hidden from the public sermon library and kept for church records."
          confirmLabel="Archive"
          destructive
          loading={saving}
          onConfirm={archive}
        />
        <ConfirmDialog
          open={unpublishOpen}
          onOpenChange={setUnpublishOpen}
          title="Unpublish this sermon?"
          description="The sermon will return to draft and will no longer appear on the public website."
          confirmLabel="Unpublish"
          loading={saving}
          onConfirm={unpublish}
        />
      </div>
    </PermissionGate>
  );
}
