import { db } from '@/lib/db';
import type { Prisma } from '@prisma/client';
import { publicStatusWhere } from '@/lib/content/status';

export function memberAnnouncementWhere(input: {
  now: Date;
  ministryIds: string[];
  includeStaff: boolean;
}): Prisma.AnnouncementWhereInput {
  const audience: Prisma.AnnouncementWhereInput[] = [
    { audience: { in: ['everyone', 'members'] } },
  ];
  if (input.ministryIds.length > 0) {
    audience.push({
      audience: 'ministry',
      ministryId: { in: input.ministryIds },
    });
  }
  if (input.includeStaff) {
    audience.push({ audience: { in: ['staff', 'ministry_leaders', 'volunteers'] } });
  }

  return {
    AND: [
      publicStatusWhere(input.now),
      { startAt: { lte: input.now } },
      { OR: [{ endAt: null }, { endAt: { gt: input.now } }] },
      { OR: audience },
    ],
  };
}

export async function listMemberAnnouncements(input: {
  userId: string;
  ministryIds: string[];
  includeStaff: boolean;
  page?: number;
  pageSize?: number;
}) {
  const now = new Date();
  const page = Math.max(1, input.page || 1);
  const pageSize = Math.min(50, Math.max(1, input.pageSize || 20));
  const where = memberAnnouncementWhere({
    now,
    ministryIds: input.ministryIds,
    includeStaff: input.includeStaff,
  });

  const [totalItems, rows] = await Promise.all([
    db.announcement.count({ where }),
    db.announcement.findMany({
      where,
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        content: true,
        category: true,
        priority: true,
        audience: true,
        startAt: true,
        isFeatured: true,
      },
      orderBy: [{ priority: 'desc' }, { startAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const reads = rows.length
    ? await db.announcementRead.findMany({
        where: {
          userId: input.userId,
          announcementId: { in: rows.map((row) => row.id) },
        },
        select: { announcementId: true, readAt: true },
      })
    : [];
  const readMap = new Map(reads.map((row) => [row.announcementId, row.readAt]));

  return {
    page,
    pageSize,
    totalItems,
    announcements: rows.map((row) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      excerpt: row.excerpt,
      content: row.content,
      category: row.category,
      priority: row.priority,
      audience: row.audience,
      startAt: row.startAt.toISOString(),
      isFeatured: row.isFeatured,
      read: readMap.has(row.id),
      readAt: readMap.get(row.id)?.toISOString() ?? null,
    })),
  };
}

export async function markAnnouncementRead(userId: string, announcementId: string) {
  return db.announcementRead.upsert({
    where: { userId_announcementId: { userId, announcementId } },
    update: { readAt: new Date() },
    create: { userId, announcementId },
  });
}
