import { db } from '@/lib/db';
import { ministriesData } from '@/data/ministries';

const positions = [
  { title: 'Senior Priest', sortOrder: 1 },
  { title: 'Head Deacon', sortOrder: 2 },
  { title: "Women's Fellowship Leader", sortOrder: 3 },
  { title: 'Youth Ministry Coordinator', sortOrder: 4 },
  { title: 'Sunday School Director', sortOrder: 5 },
  { title: 'Choir Director', sortOrder: 6 },
];

const leaders = [
  { firstName: 'Samuel', lastName: 'Tesfaye', title: 'Senior Priest', position: 'Senior Priest' },
  { firstName: 'Daniel', lastName: 'Tadesse', title: 'Head Deacon', position: 'Head Deacon' },
  { firstName: 'Martha', lastName: 'Kebede', title: "Women's Fellowship Leader", position: "Women's Fellowship Leader" },
  { firstName: 'Yohannes', lastName: 'Alemu', title: 'Youth Ministry Coordinator', position: 'Youth Ministry Coordinator' },
  { firstName: 'Ruth', lastName: 'Haile', title: 'Sunday School Director', position: 'Sunday School Director' },
  { firstName: 'Tadesse', lastName: 'Girma', title: 'Choir Director', position: 'Choir Director' },
];

const categoryBySlug: Record<string, string> = {
  'choir-music': 'Worship',
  youth: 'Youth',
  'womens-fellowship': 'Fellowship',
  'sunday-school': 'Education',
  prayer: 'Prayer',
  'community-outreach': 'Outreach',
  evangelism: 'Outreach',
  diaconate: 'Service',
};

export async function seedAdminContent() {
  const existingMinistry = await db.ministry.findFirst();
  if (!existingMinistry) {
    for (const [index, ministry] of ministriesData.entries()) {
      await db.ministry.create({
        data: {
          slug: ministry.slug,
          name: ministry.name,
          description: ministry.description,
          leaderName: ministry.leaderName,
          category: categoryBySlug[ministry.slug] || 'General',
          status: 'published',
          isActive: true,
          sortOrder: index,
        },
      });
    }
    console.log(`[Seed] Created ${ministriesData.length} ministries`);
  } else {
    console.log('[Seed] Ministries already exist, skipping.');
  }

  const existingPosition = await db.leadershipPosition.findFirst();
  if (!existingPosition) {
    const created = [];
    for (const position of positions) {
      created.push(
        await db.leadershipPosition.create({
          data: {
            title: position.title,
            sortOrder: position.sortOrder,
            isActive: true,
          },
        })
      );
    }
    const byTitle = new Map(created.map((item) => [item.title, item.id]));
    for (const [index, leader] of leaders.entries()) {
      await db.leader.create({
        data: {
          firstName: leader.firstName,
          lastName: leader.lastName,
          title: leader.title,
          bio: 'Official biography pending verification by church leadership.',
          status: 'draft',
          isActive: true,
          sortOrder: index,
          positionId: byTitle.get(leader.position) || null,
        },
      });
    }
    console.log(`[Seed] Created ${positions.length} positions and ${leaders.length} leaders (draft)`);
  } else {
    console.log('[Seed] Leadership already exists, skipping.');
  }

  await db.churchSetting.upsert({
    where: { key: 'maintenance_mode' },
    update: {},
    create: { key: 'maintenance_mode', value: 'false' },
  });
  await db.churchSetting.upsert({
    where: { key: 'timezone' },
    update: {},
    create: { key: 'timezone', value: 'Africa/Addis_Ababa' },
  });
  await db.churchSetting.upsert({
    where: { key: 'default_language' },
    update: {},
    create: { key: 'default_language', value: 'en' },
  });
}
