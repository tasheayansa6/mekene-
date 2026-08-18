/**
 * Seed data for Church Information module (Phase 4)
 * 
 * DEMO DATA ONLY — All church-specific information is placeholder.
 * Real content should be entered by church administrators.
 */

import { db } from '@/lib/db';

const DAY_ORDER: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

export async function seedChurchInfo() {
  const existing = await db.churchProfile.findFirst();
  if (existing) {
    console.log('[Seed] Church profile already exists, skipping.');
    return existing;
  }

  const profile = await db.churchProfile.create({
    data: {
      name: 'Busa Mekenene Eyasus Church',
      shortName: 'BME Church',
      nameNative: 'ቡሳ መኰንኔ ኢየሱስ ቤተክርስትያን',
      description:
        'Busa Mekenene Eyasus Church is a vibrant Ethiopian Evangelical Church Mekane Yesus community dedicated to worship, spiritual growth, and serving others in the name of Jesus Christ.',
      welcomeMessage:
        '[DEMO] Welcome to Busa Mekenene Eyasus Church! We are a community of believers in the Ethiopian Evangelical Church Mekane Yesus, gathered to worship God, grow in faith, and serve our neighbors.',
      history:
        '[DEMO PLACEHOLDER — Official church history pending verification by church leadership.] Busa Mekenene Eyasus Church was established as part of the Ethiopian Evangelical Church Mekane Yesus denomination, serving the spiritual needs of the local community in Addis Ababa.',
      vision:
        '[DEMO PLACEHOLDER — Official vision pending verification.] To be a Christ-centered community that transforms lives through the Gospel, nurtures spiritual growth, and serves as a beacon of hope in Addis Ababa.',
      mission:
        '[DEMO PLACEHOLDER — Official mission pending verification.] To glorify God through vibrant worship, to make disciples through biblical teaching, to build community through genuine fellowship, and to demonstrate Christ\'s love through compassionate service.',
      beliefs:
        '[DEMO PLACEHOLDER — Official beliefs pending verification.] We believe in the triune God — Father, Son, and Holy Spirit. We believe in the authority of the Bible as the inspired Word of God. We believe in salvation by grace through faith in Jesus Christ. We believe in the priesthood of all believers. We believe in the Great Commission to make disciples of all nations. We believe in the return of Jesus Christ.',
      coreValues:
        JSON.stringify([
          { title: 'Faith', description: '[DEMO] Trusting in God and His promises.' },
          { title: 'Worship', description: '[DEMO] Praising God with sincerity and joy.' },
          { title: 'Community', description: '[DEMO] Building authentic relationships.' },
          { title: 'Service', description: '[DEMO] Serving others in Christ\'s name.' },
          { title: 'Education', description: '[DEMO] Growing through Bible study and teaching.' },
          { title: 'Unity', description: '[DEMO] Walking together in fellowship.' },
        ]),
      worshipInfo:
        '[DEMO PLACEHOLDER — Official worship information pending verification.] Our worship services feature congregational singing, prayer, Bible reading, and biblical preaching. Services are conducted in Amharic with some English elements.',
      logoUrl: '/logo.svg',
      faviconUrl: '/favicon.ico',
      ogImageUrl: '/images/hero-church.jpg',
      email: 'info@busamekeneneeyasus.org',
      phone: '+251-XX-XXX-XXXX',
      website: 'https://busamekeneneeyasus.org',
      denomination: 'Ethiopian Evangelical Church Mekane Yesus',
      language: 'Amharic',
      status: 'published',
      isActive: true,
      serviceSchedules: {
        create: [
          {
            dayOfWeek: 'Sunday',
            serviceName: 'Sunday Worship Service',
            startTime: '09:00',
            endTime: '12:00',
            description: '[DEMO] Main Sunday worship with congregational singing, prayer, and biblical preaching.',
            location: 'Main Sanctuary',
            sortOrder: DAY_ORDER['Sunday'],
            isActive: true,
          },
          {
            dayOfWeek: 'Wednesday',
            serviceName: 'Midweek Bible Study',
            startTime: '18:00',
            endTime: '20:00',
            description: '[DEMO] Weekly Bible study and prayer meeting for spiritual growth.',
            location: 'Church Hall',
            sortOrder: DAY_ORDER['Wednesday'],
            isActive: true,
          },
          {
            dayOfWeek: 'Friday',
            serviceName: 'Friday Prayer Meeting',
            startTime: '17:00',
            endTime: '19:00',
            description: '[DEMO] Dedicated time of corporate prayer and intercession.',
            location: 'Prayer Room',
            sortOrder: DAY_ORDER['Friday'],
            isActive: true,
          },
          {
            dayOfWeek: 'Saturday',
            serviceName: 'Sunday School',
            startTime: '08:00',
            endTime: '10:00',
            description: '[DEMO] Religious education for children, youth, and adults.',
            location: 'Education Wing',
            sortOrder: DAY_ORDER['Saturday'],
            isActive: true,
          },
        ],
      },
      locations: {
        create: [
          {
            name: 'Main Campus',
            description: '[DEMO] Our primary worship center and church offices.',
            address: 'Addis Ababa',
            city: 'Addis Ababa',
            region: 'Addis Ababa',
            country: 'Ethiopia',
            latitude: 9.02,
            longitude: 38.75,
            phone: '+251-XX-XXX-XXXX',
            email: 'info@busamekeneneeyasus.org',
            isMainLocation: true,
            isActive: true,
          },
        ],
      },
      socialLinks: {
        create: [
          {
            platform: 'facebook',
            url: 'https://facebook.com/busamekeneneeyasus',
            displayName: 'Facebook',
            sortOrder: 0,
            isActive: true,
          },
          {
            platform: 'youtube',
            url: 'https://youtube.com/@busamekeneneeyasus',
            displayName: 'YouTube',
            sortOrder: 1,
            isActive: true,
          },
          {
            platform: 'telegram',
            url: 'https://t.me/busamekeneneeyasus',
            displayName: 'Telegram',
            sortOrder: 2,
            isActive: true,
          },
        ],
      },
    },
    include: {
      serviceSchedules: true,
      locations: true,
      socialLinks: true,
    },
  });

  console.log(
    `[Seed] Church profile created with ${profile.serviceSchedules.length} services, ${profile.locations.length} location(s), ${profile.socialLinks.length} social link(s).`
  );
  return profile;
}

/**
 * Run seed: bun run src/seed.ts
 */
async function main() {
  await seedChurchInfo();
  console.log('[Seed] Church info seed complete.');
  await db.$disconnect();
}

main().catch((e) => {
  console.error('[Seed] Error:', e);
  process.exit(1);
});
