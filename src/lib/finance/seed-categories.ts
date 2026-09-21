import { db } from '@/lib/db';
import { slugify } from '@/lib/admin/slug';

const DEFAULT_CATEGORIES = [
  'Facilities & Maintenance',
  'Utilities',
  'Ministry Programs',
  'Office & Administration',
  'Outreach & Benevolence',
  'Travel & Transportation',
  'Other',
];

export async function seedExpenseCategories() {
  for (const [index, name] of DEFAULT_CATEGORIES.entries()) {
    const slug = slugify(name);
    await db.expenseCategory.upsert({
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
