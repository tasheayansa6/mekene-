export interface ActivityRecord {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  details: string | null;
  ipAddress: string | null;
  createdAt: string;
  user: { id: string; email: string; name: string } | null;
}

const ACTION_LABELS: Record<string, string> = {
  login: 'Signed in',
  logout: 'Signed out',
  register: 'New user registered',
  user_created: 'User created',
  role_changed: 'Role changed',
  permission_changed: 'Permissions updated',
  account_status_changed: 'Account status changed',
  account_suspended: 'Account suspended',
  account_deactivated: 'Account deactivated',
  create: 'Created',
  update: 'Updated',
  delete: 'Deleted',
  publish: 'Published',
  unpublish: 'Unpublished',
  archive: 'Archived',
  activate: 'Activated',
  deactivate: 'Deactivated',
  submitted: 'Membership application submitted',
  approved: 'Membership approved',
  rejected: 'Membership application declined',
  reviewed: 'Membership application reviewed',
  requested: 'Membership information requested',
  updated: 'Updated',
  created: 'Created',
  changed: 'Changed',
  archived: 'Archived',
  'content.created': 'Content created',
  'content.updated': 'Content updated',
  'content.published': 'Content published',
  'content.unpublished': 'Content unpublished',
  'content.archived': 'Content archived',
  'content.deleted': 'Content deleted',
  'announcement.created': 'Announcement created',
  'category.created': 'Category created',
  'tag.created': 'Tag created',
  'event.created': 'Event created',
  'event.updated': 'Event updated',
  'event.published': 'Event published',
  'event.unpublished': 'Event unpublished',
  'event.cancelled': 'Event cancelled',
  'event.archived': 'Event archived',
  'event.deleted': 'Event deleted',
  'event.starting_soon': 'Event starting soon',
  'prayer_request.created': 'Prayer request received',
  'prayer_request.assigned': 'Prayer request assigned',
  'prayer_request.approved': 'Prayer request approved',
  'prayer_request.status_changed': 'Prayer request status changed',
  'prayer_request.rejected': 'Prayer request rejected',
  'prayer_request.archived': 'Prayer request archived',
  'prayer_request.deleted': 'Prayer request deleted',
  'sermon.created': 'Sermon created',
  'sermon.updated': 'Sermon updated',
  'sermon.published': 'Sermon published',
  'sermon.unpublished': 'Sermon unpublished',
  'sermon.archived': 'Sermon archived',
  'gallery.album_created': 'Gallery album created',
  'gallery.album_updated': 'Gallery album updated',
  'gallery.album_published': 'Gallery album published',
  'gallery.album_archived': 'Gallery album archived',
  'gallery.media_uploaded': 'Gallery media uploaded',
  'gallery.media_updated': 'Gallery media updated',
  'gallery.media_published': 'Gallery media published',
  'gallery.media_removed': 'Gallery media removed',
  'gallery.media_reordered': 'Gallery media reordered',
};

const ENTITY_LABELS: Record<string, string> = {
  user: 'user',
  auth: 'account',
  ministry: 'ministry',
  leader: 'leader',
  leadership_position: 'leadership position',
  church_profile: 'church information',
  service_schedule: 'service time',
  church_location: 'location',
  social_link: 'social link',
  settings: 'system settings',
  cms_page: 'page',
  news_article: 'news article',
  announcement: 'announcement',
  resource: 'resource',
  content_category: 'category',
  content_tag: 'tag',
  event: 'event',
  event_category: 'event category',
  event_location: 'event location',
  sermon: 'sermon',
  prayer_request: 'prayer request',
  gallery_album: 'gallery album',
  gallery_media: 'gallery media',
  gallery_category: 'gallery category',
  membership: 'membership',
  member: 'member',
  attendance: 'attendance',
  giving: 'giving',
};

export function describeActivity(record: {
  action: string;
  entity: string;
  details?: string | null;
}): string {
  const entity = ENTITY_LABELS[record.entity] || record.entity.replace(/_/g, ' ');
  if (record.action === 'register') return 'New user registered';
  if (record.action === 'login') return 'Administrator signed in';
  if (record.action === 'logout') return 'Administrator signed out';
  if (record.action === 'role_changed') return 'User role changed';
  if (record.action === 'permission_changed') return 'Role permissions changed';
  if (record.action === 'account_status_changed') return 'Account status changed';
  if (record.action === 'user_created') return 'New user created';
  if (record.entity === 'church_profile' && record.action === 'update') {
    return 'Church information changed';
  }
  if (record.entity === 'ministry' && record.action === 'update') return 'Ministry updated';
  if (record.entity === 'leader' && record.action === 'update') return 'Leader profile updated';
  if (record.entity === 'ministry' && record.action === 'publish') {
    return 'Ministry published';
  }

  const action = ACTION_LABELS[record.action] || record.action.replace(/_/g, ' ');
  if (['Created', 'Updated', 'Deleted', 'Published', 'Unpublished', 'Archived', 'Activated', 'Deactivated'].includes(action)) {
    return `${entity.charAt(0).toUpperCase()}${entity.slice(1)} ${action.toLowerCase()}`;
  }
  return `${action} (${entity})`;
}

export function parseSafeDetails(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const clean: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(parsed)) {
      const lowered = key.toLowerCase();
      if (
        lowered.includes('password') ||
        lowered.includes('token') ||
        lowered.includes('secret') ||
        lowered.includes('hash') ||
        lowered.includes('csrf') ||
        lowered.includes('session')
      ) {
        continue;
      }
      clean[key] = value;
    }
    return clean;
  } catch {
    return null;
  }
}
