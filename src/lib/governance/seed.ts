import { db } from '@/lib/db';
import { slugify } from './write';

const REQUEST_CATEGORIES = [
  { name: 'Membership', description: 'Membership-related requests', slaHours: 72 },
  { name: 'Ministry', description: 'Ministry participation or transfer', slaHours: 72 },
  { name: 'Event', description: 'Event planning or facility use', slaHours: 48 },
  { name: 'Facility', description: 'Building or room requests', slaHours: 48 },
  { name: 'Document', description: 'Records or certificate requests', slaHours: 120 },
  { name: 'Volunteer', description: 'Volunteer scheduling or changes', slaHours: 48 },
];

const DEFAULT_SETTINGS: Array<{ key: string; value: string }> = [
  { key: 'resolution_number_format', value: 'YEAR-NUMBER' },
  { key: 'term_reminder_days', value: '30,60,90' },
];

export async function seedGovernanceCatalog() {
  for (const [index, cat] of REQUEST_CATEGORIES.entries()) {
    const slug = slugify(cat.name);
    await db.adminRequestCategory.upsert({
      where: { slug },
      create: {
        name: cat.name,
        slug,
        description: cat.description,
        slaHours: cat.slaHours,
        sortOrder: index,
        isActive: true,
      },
      update: {
        description: cat.description,
        slaHours: cat.slaHours,
        isActive: true,
      },
    });
  }

  for (const setting of DEFAULT_SETTINGS) {
    await db.governanceSetting.upsert({
      where: { key: setting.key },
      create: setting,
      update: { value: setting.value },
    });
  }
}
