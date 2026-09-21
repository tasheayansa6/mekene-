import { db } from '@/lib/db';
import { slugify } from '../../src/lib/admin/slug';

const categories = [
  'Health',
  'Family',
  'Spiritual Growth',
  'Work',
  'Education',
  'Thanksgiving',
  'Guidance',
  'Other',
];

export async function seedPrayerTaxonomy() {
  for (const [index, name] of categories.entries()) {
    const slug = slugify(name);
    await db.prayerCategory.upsert({
      where: { slug },
      update: { name, sortOrder: index },
      create: { name, slug, sortOrder: index },
    });
  }
  console.log('[Seed] Prayer categories are available. No personal prayer requests were created.');
}
