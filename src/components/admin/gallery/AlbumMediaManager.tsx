'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from '@/lib/api/client';
import { ensureCsrfToken, getCsrfToken } from '@/lib/api/client';
import { CSRF_HEADER_NAME } from '@/lib/auth/config';
import { useAuth } from '@/components/providers/AuthProvider';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { publicErrorMessage } from '@/lib/admin/http-error';
import { MAX_GALLERY_UPLOADS } from '@/lib/gallery/status';

interface MediaItem {
  id: string;
  title: string;
  mediaType: 'photo' | 'video';
  fileUrl?: string | null;
  thumbnailUrl?: string | null;
  caption?: string | null;
  altText?: string | null;
  status?: string;
  isFeatured?: boolean;
  video?: { watchUrl: string } | null;
}

interface UploadJob {
  name: string;
  progress: number;
  status: 'uploading' | 'success' | 'failed' | 'cancelled';
  message?: string;
  file?: File;
}

function SortableRow({
  item,
  canUpdate,
  onMove,
  onSave,
  onRemove,
  isFirst,
  isLast,
}: {
  item: MediaItem;
  canUpdate: boolean;
  onMove: (dir: -1 | 1) => void;
  onSave: (patch: Partial<MediaItem>) => void;
  onRemove: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const [title, setTitle] = useState(item.title);
  const [caption, setCaption] = useState(item.caption || '');
  const [altText, setAltText] = useState(item.altText || '');

  useEffect(() => {
    setTitle(item.title);
    setCaption(item.caption || '');
    setAltText(item.altText || '');
  }, [item.title, item.caption, item.altText]);

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-start"
    >
      <button
        type="button"
        className="mt-1 hidden size-8 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted sm:flex focus-ring"
        aria-label={`Drag to reorder ${item.title}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      {item.thumbnailUrl || item.fileUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.thumbnailUrl || item.fileUrl || ''}
          alt=""
          className="h-20 w-28 rounded object-cover"
        />
      ) : (
        <div className="flex h-20 w-28 items-center justify-center rounded bg-muted text-xs">Video</div>
      )}
      <div className="grid min-w-0 flex-1 gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{item.mediaType}</Badge>
          <Badge variant={item.status === 'published' ? 'default' : 'outline'}>{item.status}</Badge>
          {item.isFeatured ? <Badge>Featured</Badge> : null}
        </div>
        <Input value={title} onChange={(event) => setTitle(event.target.value)} aria-label="Media title" />
        <Input value={caption} onChange={(event) => setCaption(event.target.value)} aria-label="Caption" placeholder="Caption" />
        {item.mediaType === 'photo' ? (
          <Input value={altText} onChange={(event) => setAltText(event.target.value)} aria-label="Alt text" placeholder="Alt text (required to publish)" />
        ) : null}
        {canUpdate ? (
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => onSave({ title, caption, altText })}>
              Save details
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => onMove(-1)} disabled={isFirst} aria-label="Move up">
              Move up
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => onMove(1)} disabled={isLast} aria-label="Move down">
              Move down
            </Button>
            <Button
              type="button"
              size="sm"
              variant={item.isFeatured ? 'secondary' : 'outline'}
              onClick={() => onSave({ isFeatured: !item.isFeatured })}
            >
              {item.isFeatured ? 'Unfeature' : 'Set featured'}
            </Button>
            <Button type="button" size="sm" variant="destructive" onClick={onRemove}>
              Remove
            </Button>
          </div>
        ) : null}
      </div>
    </li>
  );
}

export function AlbumMediaManager({ albumId }: { albumId: string }) {
  const { can } = useAuth();
  const canUpdate = can('gallery.update');
  const canPublish = can('gallery.publish');
  const [items, setItems] = useState<MediaItem[]>([]);
  const [jobs, setJobs] = useState<UploadJob[]>([]);
  const [videoTitle, setVideoTitle] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [removeId, setRemoveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function load() {
    void apiGet<MediaItem[]>(`/admin/gallery/albums/${albumId}/media`).then((result) => {
      setItems((result.data || []) as MediaItem[]);
    });
  }

  useEffect(() => {
    load();
  }, [albumId]);

  const ids = useMemo(() => items.map((item) => item.id), [items]);

  async function persistOrder(next: MediaItem[]) {
    setItems(next);
    const result = await apiPut(`/admin/gallery/albums/${albumId}/media`, { ids: next.map((item) => item.id) });
    if (!result.success) toast.error(publicErrorMessage(result.status, result.message));
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);
    void persistOrder(arrayMove(items, oldIndex, newIndex));
  }

  async function saveItem(id: string, patch: Partial<MediaItem>) {
    const result = await apiPatch(`/admin/gallery/albums/${albumId}/media/${id}`, patch);
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    toast.success('Media updated.');
    load();
  }

  async function publishItem(id: string) {
    const result = await apiPatch(`/admin/gallery/albums/${albumId}/media/${id}`, { status: 'published' });
    if (!result.success) toast.error(publicErrorMessage(result.status, result.message));
    else {
      toast.success('Media published.');
      load();
    }
  }

  function uploadWithProgress(file: File, index: number) {
    return new Promise<void>((resolve) => {
      const xhr = new XMLHttpRequest();
      const body = new FormData();
      body.set('file', file);
      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) return;
        const progress = Math.round((event.loaded / event.total) * 100);
        setJobs((current) => current.map((job, i) => (i === index ? { ...job, progress } : job)));
      };
      xhr.onreadystatechange = () => {
        if (xhr.readyState !== 4) return;
        try {
          const json = JSON.parse(xhr.responseText || '{}');
          if (xhr.status >= 200 && xhr.status < 300 && json.success) {
            const saved = json.data?.saved?.[0];
            setJobs((current) => current.map((job, i) => (i === index ? { ...job, status: 'success', progress: 100 } : job)));
            if (saved?.url) {
              void apiPost(`/admin/gallery/albums/${albumId}/media`, {
                title: file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').slice(0, 180) || 'Development Test Photo',
                mediaType: 'photo',
                fileUrl: saved.url,
                thumbnailUrl: saved.thumbnailUrl,
                altText: '',
                status: 'draft',
              }).then(() => load());
            }
          } else {
            setJobs((current) =>
              current.map((job, i) =>
                i === index ? { ...job, status: 'failed', message: json.message || 'Upload failed.' } : job
              )
            );
          }
        } catch {
          setJobs((current) =>
            current.map((job, i) => (i === index ? { ...job, status: 'failed', message: 'Upload failed.' } : job))
          );
        }
        resolve();
      };
      void ensureCsrfToken().then((csrf) => {
        xhr.open('POST', '/api/v1/admin/gallery/uploads');
        xhr.withCredentials = true;
        if (csrf) xhr.setRequestHeader(CSRF_HEADER_NAME, csrf);
        xhr.send(body);
      });
    });
  }

  async function startUploads(files: File[]) {
    const chosen = files.slice(0, MAX_GALLERY_UPLOADS);
    if (files.length > MAX_GALLERY_UPLOADS) {
      toast.error(`Upload at most ${MAX_GALLERY_UPLOADS} photos at a time.`);
    }
    const nextJobs: UploadJob[] = chosen.map((file) => ({
      name: file.name,
      progress: 0,
      status: 'uploading',
      file,
    }));
    setJobs(nextJobs);
    for (let index = 0; index < chosen.length; index += 1) {
      await uploadWithProgress(chosen[index], index);
    }
  }

  async function addVideo() {
    const result = await apiPost(`/admin/gallery/albums/${albumId}/media`, {
      title: videoTitle || 'Development Test Video',
      mediaType: 'video',
      externalUrl: videoUrl,
      status: 'draft',
    });
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    setVideoTitle('');
    setVideoUrl('');
    toast.success('Video added as a draft.');
    load();
  }

  return (
    <fieldset className="space-y-4 rounded-md border p-4">
      <legend className="px-1 text-sm font-semibold">Album media</legend>
      <p className="text-sm text-muted-foreground">
        Photos stay in draft until reviewed. Large videos should be hosted on YouTube or Vimeo. Do not re-upload sermon videos.
      </p>
      {canUpdate ? (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="bulk-photos">Upload photos</Label>
            <Input
              id="bulk-photos"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={(event) => {
                const files = Array.from(event.target.files || []);
                if (files.length) void startUploads(files);
                event.target.value = '';
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="video-url">Add YouTube or Vimeo video</Label>
            <Input id="video-title" value={videoTitle} onChange={(event) => setVideoTitle(event.target.value)} placeholder="Title" />
            <Input id="video-url" value={videoUrl} onChange={(event) => setVideoUrl(event.target.value)} placeholder="https://www.youtube.com/watch?v=" />
            <Button type="button" variant="outline" onClick={() => void addVideo()}>
              Add video
            </Button>
          </div>
        </div>
      ) : null}
      {jobs.length ? (
        <ul className="space-y-2 text-sm">
          {jobs.map((job) => (
            <li key={job.name} className="rounded border p-2">
              <div className="flex items-center justify-between gap-2">
                <span>{job.name}</span>
                <span>
                  {job.status === 'uploading' ? `Uploading... ${job.progress}%` : job.status}
                </span>
              </div>
              {job.status === 'failed' && job.file ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  onClick={() => {
                    const index = jobs.findIndex((row) => row.name === job.name);
                    if (index >= 0 && job.file) {
                      setJobs((current) =>
                        current.map((row, i) => (i === index ? { ...row, status: 'uploading', progress: 0 } : row))
                      );
                      void uploadWithProgress(job.file, index);
                    }
                  }}
                >
                  Retry
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <ul className="space-y-3">
            {items.map((item, index) => (
              <SortableRow
                key={item.id}
                item={item}
                canUpdate={canUpdate}
                isFirst={index === 0}
                isLast={index === items.length - 1}
                onMove={(dir) => {
                  const nextIndex = index + dir;
                  if (nextIndex < 0 || nextIndex >= items.length) return;
                  void persistOrder(arrayMove(items, index, nextIndex));
                }}
                onSave={(patch) => void saveItem(item.id, patch)}
                onRemove={() => setRemoveId(item.id)}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
      {items.length === 0 ? <p className="text-sm text-muted-foreground">No media in this album yet.</p> : null}
      {canPublish
        ? items
            .filter((item) => item.status !== 'published')
            .map((item) => (
              <Button key={`publish-${item.id}`} type="button" variant="ghost" size="sm" onClick={() => void publishItem(item.id)}>
                Publish {item.title}
              </Button>
            ))
        : null}
      <ConfirmDialog
        open={Boolean(removeId)}
        onOpenChange={(open) => !open && setRemoveId(null)}
        title="Remove this media item?"
        description="Published items are archived unless you have delete permission. This action is recorded in the audit log."
        confirmLabel="Remove"
        destructive
        onConfirm={async () => {
          if (!removeId) return;
          const result = await apiDelete(`/admin/gallery/albums/${albumId}/media/${removeId}`);
          if (!result.success) toast.error(publicErrorMessage(result.status, result.message));
          else {
            toast.success(result.message || 'Removed.');
            load();
          }
          setRemoveId(null);
        }}
      />
      {jobs.some((job) => job.status === 'uploading') ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Uploading... You can keep editing this album.
        </p>
      ) : null}
    </fieldset>
  );
}
