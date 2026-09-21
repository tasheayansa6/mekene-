import { db } from '@/lib/db';
import { sanitizePlainText } from '@/lib/content/sanitize';
import { checkResourceConflicts } from './conflicts';
import { emitEventLifecycle } from './lifecycle';
import type { ResourceAvailabilityStatus, ReservationStatus } from '@prisma/client';

export async function listBookableResources(activeOnly = true) {
  return db.bookableResource.findMany({
    where: activeOnly ? { isActive: true } : undefined,
    orderBy: { name: 'asc' },
  });
}

export async function createBookableResource(input: {
  name: string;
  slug: string;
  resourceType?: string;
  quantity?: number;
  status?: ResourceAvailabilityStatus;
  notes?: string | null;
}) {
  return db.bookableResource.create({
    data: {
      name: sanitizePlainText(input.name, 120),
      slug: input.slug,
      resourceType: sanitizePlainText(input.resourceType || 'equipment', 40),
      quantity: Math.max(1, input.quantity ?? 1),
      status: input.status || 'available',
      notes: input.notes ? sanitizePlainText(input.notes, 800) : null,
    },
  });
}

export async function updateBookableResource(
  id: string,
  data: {
    name?: string;
    resourceType?: string;
    quantity?: number;
    status?: ResourceAvailabilityStatus;
    notes?: string | null;
    isActive?: boolean;
  }
) {
  return db.bookableResource.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: sanitizePlainText(data.name, 120) } : {}),
      ...(data.resourceType !== undefined
        ? { resourceType: sanitizePlainText(data.resourceType, 40) }
        : {}),
      ...(data.quantity !== undefined ? { quantity: Math.max(1, data.quantity) } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.notes !== undefined
        ? { notes: data.notes ? sanitizePlainText(data.notes, 800) : null }
        : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
    },
  });
}

export class ReservationError extends Error {
  constructor(
    public code: 'conflict' | 'invalid' | 'not_found',
    message: string
  ) {
    super(message);
  }
}

export async function reserveResource(input: {
  resourceId: string;
  eventId?: string | null;
  quantity?: number;
  startAt: Date;
  endAt: Date;
  notes?: string | null;
  createdById?: string;
  request?: Request;
}) {
  if (input.endAt <= input.startAt) {
    throw new ReservationError('invalid', 'Reservation end must be after start.');
  }
  const conflicts = await checkResourceConflicts({
    resourceId: input.resourceId,
    startAt: input.startAt,
    endAt: input.endAt,
    quantity: input.quantity,
  });
  if (conflicts.length) {
    throw new ReservationError('conflict', conflicts[0].message);
  }

  return db.$transaction(async (tx) => {
    // Re-check inside transaction for race safety
    const resource = await tx.bookableResource.findUnique({ where: { id: input.resourceId } });
    if (!resource || !resource.isActive) {
      throw new ReservationError('not_found', 'Resource not found.');
    }
    const overlaps = await tx.resourceReservation.findMany({
      where: {
        resourceId: input.resourceId,
        status: { in: ['pending', 'confirmed'] },
        startAt: { lt: input.endAt },
        endAt: { gt: input.startAt },
      },
    });
    const reserved = overlaps.reduce((sum, row) => sum + row.quantity, 0);
    const qty = input.quantity ?? 1;
    if (reserved + qty > resource.quantity) {
      throw new ReservationError('conflict', 'Resource is already reserved for this time.');
    }
    const row = await tx.resourceReservation.create({
      data: {
        resourceId: input.resourceId,
        eventId: input.eventId || null,
        quantity: qty,
        startAt: input.startAt,
        endAt: input.endAt,
        status: 'confirmed',
        notes: input.notes ? sanitizePlainText(input.notes, 800) : null,
        createdById: input.createdById || null,
      },
      include: { resource: true },
    });
    if (input.eventId && input.createdById) {
      await emitEventLifecycle({
        type: 'event.resource_reserved',
        entityId: input.eventId,
        userId: input.createdById,
        request: input.request,
        details: { reservationId: row.id, resourceId: row.resourceId },
      });
    }
    return row;
  });
}

export async function updateReservationStatus(
  id: string,
  status: ReservationStatus,
  actorId?: string
) {
  const row = await db.resourceReservation.update({
    where: { id },
    data: { status },
  });
  if (row.eventId && actorId) {
    await emitEventLifecycle({
      type: 'event.resource_reservation_updated',
      entityId: row.eventId,
      userId: actorId,
      details: { reservationId: id, status },
    });
  }
  return row;
}

export async function listEventReservations(eventId: string) {
  return db.resourceReservation.findMany({
    where: { eventId },
    include: { resource: true },
    orderBy: { startAt: 'asc' },
  });
}
