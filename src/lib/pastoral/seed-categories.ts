import { db } from '@/lib/db';
import { slugify } from '@/lib/admin/slug';

const DEFAULT_CATEGORIES = [
  'Hospital Visit',
  'Bereavement',
  'Family Support',
  'Spiritual Care',
  'Crisis Support',
  'Follow-up Care',
  'Other',
];

export async function seedPastoralCategories() {
  for (const [index, name] of DEFAULT_CATEGORIES.entries()) {
    const slug = slugify(name);
    await db.pastoralCareCategory.upsert({
      where: { slug },
      update: { name, sortOrder: index, isActive: true },
      create: {
        name,
        slug,
        sortOrder: index,
        isActive: true,
        description: null,
      },
    });
  }
}
