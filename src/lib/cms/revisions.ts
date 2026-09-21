import { db } from '@/lib/db';

export type RevisionEntityType = 'cms_page' | 'news_article' | 'announcement' | 'resource';

export interface SaveRevisionInput {
  entityType: RevisionEntityType | string;
  entityId: string;
  title?: string | null;
  slug?: string | null;
  content: string;
  snapshot?: Record<string, unknown> | null;
  createdById?: string | null;
}

export async function saveRevision(input: SaveRevisionInput) {
  const latest = await db.contentRevision.findFirst({
    where: { entityType: input.entityType, entityId: input.entityId },
    orderBy: { version: 'desc' },
    select: { version: true },
  });
  const version = (latest?.version ?? 0) + 1;

  return db.contentRevision.create({
    data: {
      entityType: input.entityType,
      entityId: input.entityId,
      version,
      title: input.title ?? null,
      slug: input.slug ?? null,
      content: input.content,
      snapshotJson: input.snapshot ? JSON.stringify(input.snapshot) : null,
      createdById: input.createdById ?? null,
    },
  });
}

export async function listRevisions(entityType: string, entityId: string) {
  return db.contentRevision.findMany({
    where: { entityType, entityId },
    orderBy: { version: 'desc' },
    include: {
      createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });
}

export async function getRevision(id: string) {
  return db.contentRevision.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });
}

/** Returns snapshot data for the caller to apply; does not mutate content or bypass RBAC. */
export async function restoreRevision(id: string, _userId: string) {
  const revision = await getRevision(id);
  if (!revision) return null;

  let snapshot: Record<string, unknown> | null = null;
  if (revision.snapshotJson) {
    try {
      snapshot = JSON.parse(revision.snapshotJson) as Record<string, unknown>;
    } catch {
      snapshot = null;
    }
  }

  return {
    entityType: revision.entityType,
    entityId: revision.entityId,
    version: revision.version,
    title: revision.title,
    slug: revision.slug,
    content: revision.content,
    snapshot,
  };
}
