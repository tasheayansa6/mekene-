import type { CmsMenuLocation } from '@prisma/client';
import { db } from '@/lib/db';
import { navLinks } from '@/config/church';
import { sanitizeMenuHref, wouldCreateCircularParent } from './menu-urls';

const MENU_NAMES: Record<CmsMenuLocation, string> = {
  main: 'Main Navigation',
  footer: 'Footer Navigation',
  mobile: 'Mobile Navigation',
};

export interface MenuItemInput {
  id?: string;
  label: string;
  href: string;
  parentId?: string | null;
  sortOrder?: number;
  isEnabled?: boolean;
  openInNew?: boolean;
}

export interface PublicMenuItem {
  id: string;
  label: string;
  href: string;
  sortOrder: number;
  openInNew: boolean;
  children: PublicMenuItem[];
}

export async function getOrCreateMenu(location: CmsMenuLocation) {
  const existing = await db.cmsMenu.findUnique({
    where: { location },
    include: { items: { orderBy: { sortOrder: 'asc' } } },
  });
  if (existing) return existing;

  return db.cmsMenu.create({
    data: {
      name: MENU_NAMES[location],
      location,
      isActive: true,
    },
    include: { items: { orderBy: { sortOrder: 'asc' } } },
  });
}

function buildMenuTree(items: Array<{
  id: string;
  label: string;
  href: string;
  parentId: string | null;
  sortOrder: number;
  openInNew: boolean;
}>): PublicMenuItem[] {
  const byParent = new Map<string | null, typeof items>();
  for (const item of items) {
    const key = item.parentId;
    const list = byParent.get(key) ?? [];
    list.push(item);
    byParent.set(key, list);
  }

  function build(parentId: string | null): PublicMenuItem[] {
    const siblings = byParent.get(parentId) ?? [];
    return siblings
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((item) => ({
        id: item.id,
        label: item.label,
        href: item.href,
        sortOrder: item.sortOrder,
        openInNew: item.openInNew,
        children: build(item.id),
      }));
  }

  return build(null);
}

export async function getPublicMenu(location: CmsMenuLocation) {
  const menu = await db.cmsMenu.findUnique({
    where: { location, isActive: true },
    include: {
      items: {
        where: { isEnabled: true },
        orderBy: { sortOrder: 'asc' },
      },
    },
  });
  if (!menu) return { location, items: [] as PublicMenuItem[] };

  return {
    location: menu.location,
    items: buildMenuTree(menu.items),
  };
}

async function seedDefaultMainMenuIfEmpty(menuId: string) {
  const count = await db.cmsMenuItem.count({ where: { menuId } });
  if (count > 0) return;

  await db.cmsMenuItem.createMany({
    data: navLinks.map((link, index) => ({
      menuId,
      label: link.label,
      href: link.href,
      sortOrder: index,
      isEnabled: true,
      openInNew: false,
    })),
  });
}

export async function replaceMenuItems(menuId: string, items: MenuItemInput[], userId: string) {
  const menu = await db.cmsMenu.findUnique({ where: { id: menuId } });
  if (!menu) throw new Error('menu-not-found');

  if (items.length === 0) {
    await seedDefaultMainMenuIfEmpty(menuId);
    if (menu.location === 'main') {
      return db.cmsMenu.findUnique({
        where: { id: menuId },
        include: { items: { orderBy: { sortOrder: 'asc' } } },
      });
    }
  }

  const parentByTempId = new Map<string, string | null>();
  items.forEach((item, index) => {
    const key = item.id ?? `temp-${index}`;
    parentByTempId.set(key, item.parentId ?? null);
  });

  for (const [key, parentId] of parentByTempId) {
    if (parentId && !parentByTempId.has(parentId) && !items.some((i) => i.id === parentId)) {
      throw new Error('invalid-parent');
    }
    if (wouldCreateCircularParent(key.startsWith('temp-') ? null : key, parentId, parentByTempId)) {
      throw new Error('circular-parent');
    }
  }

  const sanitized = items.map((item, index) => ({
    ...item,
    href: sanitizeMenuHref(item.href),
    sortOrder: item.sortOrder ?? index,
  }));

  await db.$transaction(async (tx) => {
    await tx.cmsMenuItem.deleteMany({ where: { menuId } });

    const idMap = new Map<string, string>();
    for (let i = 0; i < sanitized.length; i++) {
      const item = sanitized[i];
      const created = await tx.cmsMenuItem.create({
        data: {
          menuId,
          label: item.label.trim().slice(0, 120),
          href: item.href,
          sortOrder: item.sortOrder ?? i,
          isEnabled: item.isEnabled ?? true,
          openInNew: item.openInNew ?? false,
          parentId: null,
        },
      });
      const tempKey = item.id ?? `temp-${i}`;
      idMap.set(tempKey, created.id);
    }

    for (let i = 0; i < sanitized.length; i++) {
      const item = sanitized[i];
      const parentRef = item.parentId;
      if (!parentRef) continue;
      const selfId = idMap.get(item.id ?? `temp-${i}`);
      const parentId = idMap.get(parentRef) ?? parentRef;
      if (!selfId || !parentId) continue;

      const parentChain = new Map<string, string | null>();
      for (let j = 0; j < sanitized.length; j++) {
        const row = sanitized[j];
        const rowId = idMap.get(row.id ?? `temp-${j}`);
        if (!rowId) continue;
        const parentKey = row.parentId;
        parentChain.set(rowId, parentKey ? idMap.get(parentKey) ?? parentKey : null);
      }
      if (wouldCreateCircularParent(selfId, parentId, parentChain)) {
        throw new Error('circular-parent');
      }

      await tx.cmsMenuItem.update({
        where: { id: selfId },
        data: { parentId },
      });
    }

    await tx.cmsMenu.update({
      where: { id: menuId },
      data: { updatedById: userId },
    });
  });

  return db.cmsMenu.findUnique({
    where: { id: menuId },
    include: { items: { orderBy: { sortOrder: 'asc' } } },
  });
}

/** Flat nav links for header/footer; falls back to static church config when CMS menu is empty. */
export async function getPublicNavLinks(location: CmsMenuLocation) {
  const menu = await getPublicMenu(location);
  if (menu.items.length > 0) {
    return menu.items.map((item) => ({ label: item.label, href: item.href }));
  }
  return navLinks.map((link) => ({ label: link.label, href: link.href }));
}

export async function getOrCreateMenuByLocation(location: CmsMenuLocation, userId?: string) {
  let menu = await getOrCreateMenu(location);
  if (location === 'main') {
    await seedDefaultMainMenuIfEmpty(menu.id);
    menu = (await db.cmsMenu.findUnique({
      where: { id: menu.id },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    }))!;
  }
  if (userId && menu) {
    await db.cmsMenu.update({
      where: { id: menu.id },
      data: { updatedById: userId },
    });
  }
  return menu;
}
