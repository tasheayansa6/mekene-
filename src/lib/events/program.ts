import { db } from '@/lib/db';
import { sanitizePlainText } from '@/lib/content/sanitize';
import { emitEventLifecycle } from './lifecycle';

export async function getOrCreateProgram(eventId: string) {
  const existing = await db.serviceProgram.findUnique({
    where: { eventId },
    include: { items: { orderBy: { sortOrder: 'asc' } } },
  });
  if (existing) return existing;
  return db.serviceProgram.create({
    data: { eventId, title: 'Service program' },
    include: { items: { orderBy: { sortOrder: 'asc' } } },
  });
}

export async function addProgramItem(input: {
  eventId: string;
  title: string;
  itemType?: string;
  description?: string | null;
  durationMinutes?: number | null;
  responsibleLabel?: string | null;
  memberId?: string | null;
  notes?: string | null;
  actorId?: string;
  request?: Request;
}) {
  const program = await getOrCreateProgram(input.eventId);
  const maxOrder = await db.serviceProgramItem.aggregate({
    where: { programId: program.id },
    _max: { sortOrder: true },
  });
  const item = await db.serviceProgramItem.create({
    data: {
      programId: program.id,
      title: sanitizePlainText(input.title, 160),
      itemType: sanitizePlainText(input.itemType || 'other', 40),
      description: input.description ? sanitizePlainText(input.description, 800) : null,
      durationMinutes: input.durationMinutes ?? null,
      responsibleLabel: input.responsibleLabel
        ? sanitizePlainText(input.responsibleLabel, 120)
        : null,
      memberId: input.memberId || null,
      notes: input.notes ? sanitizePlainText(input.notes, 800) : null,
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
    },
  });
  if (input.actorId) {
    await emitEventLifecycle({
      type: 'event.program_item_added',
      entityId: input.eventId,
      userId: input.actorId,
      request: input.request,
      details: { itemId: item.id, title: item.title },
    });
  }
  return item;
}

export async function updateProgramItem(
  itemId: string,
  data: {
    title?: string;
    itemType?: string;
    description?: string | null;
    durationMinutes?: number | null;
    responsibleLabel?: string | null;
    memberId?: string | null;
    notes?: string | null;
    status?: string;
  }
) {
  return db.serviceProgramItem.update({
    where: { id: itemId },
    data: {
      ...(data.title !== undefined ? { title: sanitizePlainText(data.title, 160) } : {}),
      ...(data.itemType !== undefined
        ? { itemType: sanitizePlainText(data.itemType, 40) }
        : {}),
      ...(data.description !== undefined
        ? { description: data.description ? sanitizePlainText(data.description, 800) : null }
        : {}),
      ...(data.durationMinutes !== undefined ? { durationMinutes: data.durationMinutes } : {}),
      ...(data.responsibleLabel !== undefined
        ? {
            responsibleLabel: data.responsibleLabel
              ? sanitizePlainText(data.responsibleLabel, 120)
              : null,
          }
        : {}),
      ...(data.memberId !== undefined ? { memberId: data.memberId } : {}),
      ...(data.notes !== undefined
        ? { notes: data.notes ? sanitizePlainText(data.notes, 800) : null }
        : {}),
      ...(data.status !== undefined ? { status: sanitizePlainText(data.status, 40) } : {}),
    },
  });
}

export async function deleteProgramItem(itemId: string) {
  return db.serviceProgramItem.delete({ where: { id: itemId } });
}

/** Reorder items transactionally by ordered id list. */
export async function reorderProgramItems(programId: string, orderedIds: string[]) {
  return db.$transaction(async (tx) => {
    const existing = await tx.serviceProgramItem.findMany({
      where: { programId },
      select: { id: true },
    });
    const existingIds = new Set(existing.map((row) => row.id));
    for (const id of orderedIds) {
      if (!existingIds.has(id)) {
        throw new Error('Program item does not belong to this program.');
      }
    }
    for (let i = 0; i < orderedIds.length; i += 1) {
      await tx.serviceProgramItem.update({
        where: { id: orderedIds[i] },
        data: { sortOrder: i },
      });
    }
    return tx.serviceProgramItem.findMany({
      where: { programId },
      orderBy: { sortOrder: 'asc' },
    });
  });
}

export async function updateProgramMeta(
  eventId: string,
  data: { title?: string | null; notes?: string | null; isPublic?: boolean }
) {
  const program = await getOrCreateProgram(eventId);
  return db.serviceProgram.update({
    where: { id: program.id },
    data: {
      ...(data.title !== undefined
        ? { title: data.title ? sanitizePlainText(data.title, 160) : null }
        : {}),
      ...(data.notes !== undefined
        ? { notes: data.notes ? sanitizePlainText(data.notes, 2000) : null }
        : {}),
      ...(data.isPublic !== undefined ? { isPublic: data.isPublic } : {}),
    },
    include: { items: { orderBy: { sortOrder: 'asc' } } },
  });
}
