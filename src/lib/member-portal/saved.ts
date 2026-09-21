import { db } from '@/lib/db';
import type { SavedItemKind } from '@prisma/client';
import { isPubliclyVisible } from '@/lib/content/status';

export const SAVED_KINDS = ['sermon', 'resource', 'event', 'page'] as const;
export type SavedKind = (typeof SAVED_KINDS)[number];

export function isSavedKind(value: string): value is SavedKind {
  return (SAVED_KINDS as readonly string[]).includes(value);
}

export async function resolveSavedTarget(kind: SavedKind, entityId: string) {
  if (kind === 'sermon') {
    const row = await db.sermon.findUnique({
      where: { id: entityId },
      select: { id: true, title: true, slug: true, status: true, accessLevel: true, publishedAt: true, publishAt: true },
    });
    if (!row || !isPubliclyVisible(row) || row.accessLevel === 'restricted') return null;
    return { id: row.id, title: row.title, href: `/sermons/${row.slug}` };
  }
  if (kind === 'resource') {
    const row = await db.resource.findUnique({
      where: { id: entityId },
      select: { id: true, title: true, slug: true, status: true, publishedAt: true, publishAt: true, accessLevel: true },
    });
    if (!row || !isPubliclyVisible(row) || row.accessLevel === 'restricted') return null;
    return { id: row.id, title: row.title, href: `/resources/${row.slug}` };
  }
  if (kind === 'event') {
    const row = await db.event.findUnique({
      where: { id: entityId },
      select: { id: true, title: true, slug: true, status: true },
    });
    if (!row || row.status !== 'published') return null;
    return { id: row.id, title: row.title, href: `/member/events/${row.slug}` };
  }
  const row = await db.cmsPage.findUnique({
    where: { id: entityId },
    select: { id: true, title: true, slug: true, status: true, visibility: true, publishedAt: true, publishAt: true },
  });
  if (!row || row.visibility !== 'public' || !isPubliclyVisible(row)) return null;
  return { id: row.id, title: row.title, href: `/pages/${row.slug}` };
}

export async function saveItem(userId: string, kind: SavedKind, entityId: string) {
  const target = await resolveSavedTarget(kind, entityId);
  if (!target) return { ok: false as const, reason: 'not_found' as const };

  const item = await db.savedItem.upsert({
    where: { userId_kind_entityId: { userId, kind: kind as SavedItemKind, entityId } },
    update: {},
    create: { userId, kind: kind as SavedItemKind, entityId },
  });

  if (kind === 'sermon') {
    await db.sermonBookmark.upsert({
      where: { userId_sermonId: { userId, sermonId: entityId } },
      update: {},
      create: { userId, sermonId: entityId },
    });
  }

  return { ok: true as const, item, target };
}

export async function listSavedItems(userId: string, page = 1, pageSize = 20) {
  const where = { userId };
  const [totalItems, rows] = await Promise.all([
    db.savedItem.count({ where }),
    db.savedItem.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const items = [];
  for (const row of rows) {
    const target = await resolveSavedTarget(row.kind, row.entityId);
    if (!target) continue;
    items.push({
      id: row.id,
      kind: row.kind,
      entityId: row.entityId,
      createdAt: row.createdAt.toISOString(),
      title: target.title,
      href: target.href,
    });
  }

  return { page, pageSize, totalItems, items };
}
