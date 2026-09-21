import { db } from '@/lib/db';

const PAGE_ENTITY = 'cms_page';

export async function recordSlugChange(input: {
  entityType: string;
  entityId: string;
  fromSlug: string;
  toSlug: string;
}) {
  if (input.fromSlug === input.toSlug) return null;

  await db.contentRedirect.updateMany({
    where: { entityType: input.entityType, entityId: input.entityId, isActive: true },
    data: { isActive: false },
  });

  return db.contentRedirect.upsert({
    where: {
      entityType_fromSlug: {
        entityType: input.entityType,
        fromSlug: input.fromSlug,
      },
    },
    create: {
      entityType: input.entityType,
      entityId: input.entityId,
      fromSlug: input.fromSlug,
      toSlug: input.toSlug,
      isActive: true,
    },
    update: {
      entityId: input.entityId,
      toSlug: input.toSlug,
      isActive: true,
    },
  });
}

export async function findActiveRedirect(entityType: string, fromSlug: string) {
  return db.contentRedirect.findFirst({
    where: { entityType, fromSlug, isActive: true },
  });
}

export async function resolvePageRedirect(fromSlug: string): Promise<string | null> {
  const redirect = await findActiveRedirect(PAGE_ENTITY, fromSlug);
  return redirect?.toSlug ?? null;
}
