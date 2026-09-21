import { db } from '@/lib/db';
import { slugify } from '../../src/lib/admin/slug';

const categories = [
  'Sunday Service',
  'Bible Study',
  'Youth',
  'Prayer',
  'Special Service',
  'Other',
];

export async function seedSermonTaxonomy() {
  for (const [index, name] of categories.entries()) {
    const slug = slugify(name);
    await db.sermonCategory.upsert({
      where: { slug },
      update: { name, sortOrder: index },
      create: { name, slug, sortOrder: index },
    });
  }
  console.log('[Seed] Sermon categories are available. No demo sermons were created.');
}
