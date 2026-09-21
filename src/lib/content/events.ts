import { db } from '@/lib/db';
import { getClientIp, logSecurityEvent } from '@/lib/auth/audit';

export type ContentEventType =
  | 'content.created'
  | 'content.updated'
  | 'content.published'
  | 'content.unpublished'
  | 'content.archived'
  | 'content.deleted'
  | 'announcement.created'
  | 'announcement.expired'
  | 'category.created'
  | 'tag.created'
  | 'sermon.created'
  | 'sermon.updated'
  | 'sermon.published'
  | 'sermon.unpublished'
  | 'sermon.archived'
  | 'sermon.audio_uploaded'
  | 'sermon.video_updated'
  | 'sermon.notes_uploaded'
  | 'event.created'
  | 'event.updated'
  | 'event.published'
  | 'event.unpublished'
  | 'event.cancelled'
  | 'event.archived'
  | 'event.deleted'
  | 'event.starting_soon'
  | 'gallery.album_created'
  | 'gallery.album_updated'
  | 'gallery.album_published'
  | 'gallery.album_archived'
  | 'gallery.media_uploaded'
  | 'gallery.media_updated'
  | 'gallery.media_published'
  | 'gallery.media_removed'
  | 'gallery.media_reordered';

export async function emitContentEvent(options: {
  type: ContentEventType;
  entity: string;
  entityId?: string | null;
  userId?: string | null;
  request?: Request;
  details?: Record<string, unknown>;
}) {
  await logSecurityEvent({
    action: options.type,
    entity: options.entity,
    entityId: options.entityId ?? null,
    userId: options.userId ?? null,
    ipAddress: options.request ? getClientIp(options.request) : null,
    details: options.details ?? null,
  });
}
