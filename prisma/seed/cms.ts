import { db } from '@/lib/db';
import { slugify } from '../../src/lib/admin/slug';

const newsCategories = [
  'Church News',
  'Community',
  'Youth',
  'Ministry',
  'Events',
  'Announcements',
  'Other',
];

const resourceCategories = [
  'Bible Study',
  'Church Documents',
  'Study Material',
  'Publications',
  'Forms',
  'Other',
];

const tags = ['Worship', 'Community', 'Youth', 'Prayer', 'Bible Study', 'Outreach'];

export async function seedCmsTaxonomy() {
  for (const [index, name] of newsCategories.entries()) {
    const slug = slugify(name);
    await db.contentCategory.upsert({
      where: { scope_slug: { scope: 'news', slug } },
      update: { name, sortOrder: index },
      create: { name, slug, scope: 'news', sortOrder: index },
    });
  }
  for (const [index, name] of resourceCategories.entries()) {
    const slug = slugify(name);
    await db.contentCategory.upsert({
      where: { scope_slug: { scope: 'resource', slug } },
      update: { name, sortOrder: index },
      create: { name, slug, scope: 'resource', sortOrder: index },
    });
  }
  for (const name of tags) {
    const slug = slugify(name);
    await db.contentTag.upsert({
      where: { slug },
      update: { name },
      create: { name, slug },
    });
  }
  console.log('[Seed] CMS categories and tags are available for administrators to use.');
}
