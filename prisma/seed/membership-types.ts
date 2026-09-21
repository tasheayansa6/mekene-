import { db } from '@/lib/db';
import { slugify } from '../../src/lib/admin/slug';

const TYPES = [
  'Full Member',
  'Associate Member',
  'Youth',
  'Child',
  'Visitor',
  'Catechumen',
  'Other',
];

export async function seedMembershipTypes() {
  for (const [index, name] of TYPES.entries()) {
    const slug = slugify(name);
    await db.membershipType.upsert({
      where: { slug },
      update: { name, sortOrder: index, isActive: true },
      create: { name, slug, sortOrder: index, isActive: true },
    });
  }
  console.log('[Seed] Membership types are available.');
}
