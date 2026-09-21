import { db } from '@/lib/db';
import { slugify } from '../../src/lib/admin/slug';

const categories = [
  'Worship',
  'Church Service',
  'Youth',
  'Children',
  'Conference',
  'Outreach',
  'Bible Study',
  'Prayer',
  'Special Event',
  'Ministry',
  'Other',
];

export async function seedGalleryTaxonomy() {
  for (const [index, name] of categories.entries()) {
    const slug = slugify(name);
    await db.galleryCategory.upsert({
      where: { slug },
      update: { name, sortOrder: index },
      create: { name, slug, sortOrder: index },
    });
  }
  console.log('[Seed] Gallery categories are available. No church photographs or videos were created.');
}
