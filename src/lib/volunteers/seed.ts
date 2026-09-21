import { db } from '@/lib/db';
import { slugify } from '@/lib/admin/slug';

const DEFAULT_DEPARTMENTS = [
  'Pastoral Office',
  'Administration',
  'Worship & Music',
  'Children & Youth',
  'Facilities',
  'Communications',
];

const DEFAULT_POSITIONS = [
  'Senior Pastor',
  'Associate Pastor',
  'Office Administrator',
  'Worship Leader',
  'Youth Director',
  'Facilities Manager',
  'Communications Coordinator',
];

const DEFAULT_SKILLS = [
  'Greeting & Ushering',
  'Sound & Media',
  'Children Ministry',
  'Worship Vocals',
  'Instrumental Music',
  'Hospitality',
  'Teaching',
  'Prayer Ministry',
  'Driving / Transport',
  'Administration',
  'Singing',
  'Photography',
  'Translation',
  'IT Support',
  'Design',
  'First Aid',
  'Event Coordination',
  'Video Production',
];

const DEFAULT_ROLES = [
  'Singer',
  'Keyboard',
  'Guitar',
  'Sound Engineer',
  'Camera Operator',
  'Usher',
  'Teacher',
  'Greeter',
];

const DEFAULT_ONBOARDING_ITEMS = [
  'Application approved',
  'Orientation',
  'Required training',
  'Team assignment',
  'Leader introduction',
  'First service',
];

export async function seedVolunteerCatalog() {
  for (const [index, name] of DEFAULT_DEPARTMENTS.entries()) {
    const slug = slugify(name);
    await db.staffDepartment.upsert({
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

  for (const [index, name] of DEFAULT_POSITIONS.entries()) {
    const slug = slugify(name);
    await db.staffPosition.upsert({
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

  for (const [index, name] of DEFAULT_SKILLS.entries()) {
    const slug = slugify(name);
    await db.volunteerSkillCatalog.upsert({
      where: { slug },
      update: { name, sortOrder: index, isActive: true },
      create: {
        name,
        slug,
        sortOrder: index,
        isActive: true,
      },
    });
  }

  for (const [index, name] of DEFAULT_ROLES.entries()) {
    const slug = slugify(name);
    await db.volunteerRole.upsert({
      where: { slug },
      update: { name, sortOrder: index, isActive: true },
      create: {
        name,
        slug,
        sortOrder: index,
        isActive: true,
        slotsRequired: 1,
      },
    });
  }

  const onboardingSlug = 'default-volunteer-onboarding';
  const template = await db.volunteerOnboardingTemplate.upsert({
    where: { slug: onboardingSlug },
    update: { name: 'Volunteer onboarding', isActive: true },
    create: {
      name: 'Volunteer onboarding',
      slug: onboardingSlug,
      isActive: true,
      ministryId: null,
    },
  });
  const existingItems = await db.volunteerOnboardingItem.count({
    where: { templateId: template.id },
  });
  if (existingItems === 0) {
    await db.volunteerOnboardingItem.createMany({
      data: DEFAULT_ONBOARDING_ITEMS.map((title, index) => ({
        templateId: template.id,
        title,
        sortOrder: index,
        isRequired: true,
      })),
    });
  }
}

/** Alias matching seed.ts naming in Phase 21 plan. */
export const seed = seedVolunteerCatalog;
