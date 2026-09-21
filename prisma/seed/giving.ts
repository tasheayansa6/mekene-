import { db } from '@/lib/db';
import { Decimal } from '@prisma/client/runtime/library';

const DEFAULT_CATEGORIES = [
  { slug: 'tithe', name: 'Tithe', sortOrder: 10, minAmount: '1.00' },
  { slug: 'offering', name: 'Offering', sortOrder: 20, minAmount: '1.00' },
  { slug: 'general', name: 'General Donation', sortOrder: 30, minAmount: '1.00' },
  { slug: 'special', name: 'Special Donation', sortOrder: 40, minAmount: '1.00' },
  { slug: 'mission', name: 'Mission', sortOrder: 50, minAmount: '1.00' },
  { slug: 'building', name: 'Building / Fund', sortOrder: 60, minAmount: '1.00' },
  { slug: 'ministry', name: 'Ministry Donation', sortOrder: 70, minAmount: '1.00' },
  { slug: 'campaign', name: 'Campaign', sortOrder: 80, minAmount: '1.00' },
  { slug: 'other', name: 'Other', sortOrder: 90, minAmount: '1.00' },
];

/** Seed contribution categories only — no fake donor amounts or campaigns. */
export async function seedGiving() {
  for (const item of DEFAULT_CATEGORIES) {
    await db.donationCategory.upsert({
      where: { slug: item.slug },
      update: {
        name: item.name,
        isActive: true,
        sortOrder: item.sortOrder,
        minAmount: new Decimal(item.minAmount),
      },
      create: {
        slug: item.slug,
        name: item.name,
        sortOrder: item.sortOrder,
        minAmount: new Decimal(item.minAmount),
        isActive: true,
      },
    });
  }

  await db.receiptSequence.upsert({
    where: { id: 'default' },
    update: {},
    create: { id: 'default', prefix: 'BME-REC', nextValue: 1 },
  });

  await db.churchGivingSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      givingYearStartMonth: 1,
      supportedCurrencies: 'ETB',
      defaultCurrency: 'ETB',
    },
  });
}
