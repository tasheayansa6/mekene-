import { db } from '@/lib/db';
import { slugify } from '../../src/lib/admin/slug';

const categories = [
  'Worship Service',
  'Sunday Service',
  'Bible Study',
  'Prayer Meeting',
  'Youth Program',
  "Children's Program",
  'Conference',
  'Seminar',
  'Training',
  'Wedding',
  'Baptism',
  'Funeral',
  'Outreach',
  'Community Event',
  'Ministry Meeting',
  'Special Event',
  'Other',
];

const venues = [
  { name: 'Main Sanctuary', capacity: 500, facilities: 'Sound system, Projector, Microphones, Chairs' },
  { name: 'Chapel', capacity: 80, facilities: 'Sound system, Chairs' },
  { name: 'Fellowship Hall', capacity: 200, facilities: 'Tables, Chairs, Kitchen access' },
  { name: 'Youth Room', capacity: 60, facilities: 'Projector, Internet' },
];

const bookableResources = [
  { name: 'Wireless Microphone', slug: 'wireless-microphone', resourceType: 'audio', quantity: 8 },
  { name: 'Projector', slug: 'projector', resourceType: 'av', quantity: 3 },
  { name: 'PA Speaker', slug: 'pa-speaker', resourceType: 'audio', quantity: 4 },
  { name: 'Folding Chairs (set)', slug: 'folding-chairs', resourceType: 'furniture', quantity: 20 },
  { name: 'Video Camera', slug: 'video-camera', resourceType: 'media', quantity: 2 },
];

export async function seedEventTaxonomy() {
  for (const [index, name] of categories.entries()) {
    const slug = slugify(name);
    await db.eventCategory.upsert({
      where: { slug },
      update: { name, sortOrder: index },
      create: { name, slug, sortOrder: index },
    });
  }
  for (const venue of venues) {
    const slug = slugify(venue.name);
    await db.eventLocation.upsert({
      where: { slug },
      update: {
        name: venue.name,
        capacity: venue.capacity,
        facilities: venue.facilities,
        isActive: true,
      },
      create: {
        name: venue.name,
        slug,
        capacity: venue.capacity,
        facilities: venue.facilities,
        isActive: true,
      },
    });
  }
  for (const resource of bookableResources) {
    await db.bookableResource.upsert({
      where: { slug: resource.slug },
      update: {
        name: resource.name,
        resourceType: resource.resourceType,
        quantity: resource.quantity,
        isActive: true,
      },
      create: {
        name: resource.name,
        slug: resource.slug,
        resourceType: resource.resourceType,
        quantity: resource.quantity,
        isActive: true,
      },
    });
  }
  console.log('[Seed] Event categories, venues, and bookable resources are available.');
}
