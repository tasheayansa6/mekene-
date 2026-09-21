export const CMS_STATUSES = [
  'draft',
  'review',
  'scheduled',
  'published',
  'archived',
] as const;

export type CmsStatusValue = (typeof CMS_STATUSES)[number];

export const FEATURED_LIMIT = 3;

export const RESERVED_PAGE_SLUGS = new Set([
  'about',
  'contact',
  'ministries',
  'sermons',
  'events',
  'news',
  'resources',
  'prayer',
  'giving',
  'gallery',
  'login',
  'register',
  'admin',
  'member',
  'profile',
  'maintenance',
  'api',
  'pages',
  'search',
  'announcements',
  'verify-email',
  'forgot-password',
  'reset-password',
  'faq',
  'faqs',
  'downloads',
  'devotionals',
  'videos',
  'testimonials',
  'cms',
]);

export interface Publishable {
  status: string;
  publishAt: Date | null;
  publishedAt?: Date | null;
  expiresAt?: Date | null;
}

export function isScheduledDue(item: Publishable, now = new Date()): boolean {
  return item.status === 'scheduled' && Boolean(item.publishAt) && item.publishAt! <= now;
}

export function isPubliclyVisible(item: Publishable, now = new Date()): boolean {
  if (item.status === 'archived' || item.status === 'draft' || item.status === 'review') {
    return false;
  }
  if (item.status === 'scheduled') {
    return Boolean(item.publishAt) && item.publishAt! <= now;
  }
  if (item.status === 'published') {
    if (item.publishAt && item.publishAt > now) return false;
    if (item.expiresAt && item.expiresAt <= now) return false;
    return true;
  }
  return false;
}

export function isAnnouncementActive(
  item: Publishable & { startAt: Date; endAt: Date | null },
  now = new Date()
): boolean {
  if (!isPubliclyVisible(item, now)) return false;
  if (item.startAt > now) return false;
  if (item.endAt && item.endAt <= now) return false;
  return true;
}

export function resolveStatusOnSave(input: {
  status?: CmsStatusValue;
  publishAt?: Date | null;
  now?: Date;
}): { status: CmsStatusValue; publishedAt: Date | null } {
  const now = input.now ?? new Date();
  let status = input.status || 'draft';
  if (status === 'published' && input.publishAt && input.publishAt > now) {
    status = 'scheduled';
  }
  if (status === 'scheduled' && (!input.publishAt || input.publishAt <= now)) {
    status = 'published';
  }
  const publishedAt =
    status === 'published' ? (input.publishAt && input.publishAt <= now ? input.publishAt : now) : null;
  return { status, publishedAt };
}

export function publicStatusWhere(now = new Date()) {
  return {
    OR: [
      {
        status: 'published' as const,
        AND: [
          {
            OR: [{ publishAt: null }, { publishAt: { lte: now } }],
          },
        ],
      },
      {
        status: 'scheduled' as const,
        publishAt: { lte: now },
      },
    ],
  };
}
