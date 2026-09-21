import { db } from '@/lib/db';

export interface HomepageSectionSeed {
  key: string;
  type: string;
  title: string | null;
  sortOrder: number;
  isEnabled: boolean;
  configJson?: string | null;
}

export const DEFAULT_HOMEPAGE_SECTIONS: HomepageSectionSeed[] = [
  { key: 'hero', type: 'hero', title: 'Hero', sortOrder: 0, isEnabled: true },
  { key: 'welcome', type: 'welcome', title: 'Welcome', sortOrder: 1, isEnabled: true },
  { key: 'services', type: 'services', title: 'Service Times', sortOrder: 2, isEnabled: true },
  { key: 'about', type: 'about', title: 'About', sortOrder: 3, isEnabled: true },
  { key: 'featured_sermon', type: 'sermon_list', title: 'Featured Sermon', sortOrder: 4, isEnabled: true },
  { key: 'featured_events', type: 'event_list', title: 'Upcoming Events', sortOrder: 5, isEnabled: true },
  { key: 'featured_news', type: 'featured_news', title: 'Featured News', sortOrder: 6, isEnabled: true },
  { key: 'announcements', type: 'announcements', title: 'Announcements', sortOrder: 7, isEnabled: true },
  { key: 'latest_news', type: 'latest_news', title: 'Latest News', sortOrder: 8, isEnabled: true },
  { key: 'featured_resources', type: 'featured_resources', title: 'Resources', sortOrder: 9, isEnabled: true },
  { key: 'gallery', type: 'gallery_preview', title: 'Gallery', sortOrder: 10, isEnabled: true },
  { key: 'testimonials', type: 'testimonials', title: 'Testimonials', sortOrder: 11, isEnabled: false },
  { key: 'give_cta', type: 'cta', title: 'Giving', sortOrder: 12, isEnabled: true },
  { key: 'cta', type: 'cta', title: 'Plan Your Visit', sortOrder: 13, isEnabled: true },
  { key: 'contact', type: 'contact', title: 'Visit Us', sortOrder: 14, isEnabled: true },
];

export async function ensureDefaultHomepageSections() {
  for (const section of DEFAULT_HOMEPAGE_SECTIONS) {
    await db.cmsHomepageSection.upsert({
      where: { key: section.key },
      create: {
        key: section.key,
        type: section.type,
        title: section.title,
        sortOrder: section.sortOrder,
        isEnabled: section.isEnabled,
        configJson: section.configJson ?? null,
      },
      update: {},
    });
  }
}

export async function listHomepageSections(options?: { enabledOnly?: boolean }) {
  await ensureDefaultHomepageSections();
  return db.cmsHomepageSection.findMany({
    where: options?.enabledOnly ? { isEnabled: true } : undefined,
    orderBy: { sortOrder: 'asc' },
  });
}

export async function updateHomepageSection(
  id: string,
  data: {
    title?: string | null;
    subtitle?: string | null;
    body?: string | null;
    configJson?: string | null;
    isEnabled?: boolean;
    sortOrder?: number;
  }
) {
  return db.cmsHomepageSection.update({
    where: { id },
    data,
  });
}

export async function reorderHomepageSections(orderedIds: string[]) {
  await db.$transaction(
    orderedIds.map((id, index) =>
      db.cmsHomepageSection.update({
        where: { id },
        data: { sortOrder: index },
      })
    )
  );
  return listHomepageSections();
}
