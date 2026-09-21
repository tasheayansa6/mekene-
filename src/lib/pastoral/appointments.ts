import { db } from '@/lib/db';
import { createVisit } from './write';
import { emitPastoralEvent } from './events';
import { serializeMemberVisit } from './member-care';
import type { PastoralVisitLocationValue } from './status';
import { PASTORAL_VISIT_LOCATIONS } from './status';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
export const CARE_AVAILABILITY_LOCATION_TYPES = ['church', 'online', 'room'] as const;
export type CareAvailabilityLocationType = (typeof CARE_AVAILABILITY_LOCATION_TYPES)[number];

export function isValidWeekday(weekday: number): boolean {
  return Number.isInteger(weekday) && weekday >= 0 && weekday <= 6;
}

export function isValidTimeSlot(value: string): boolean {
  return TIME_PATTERN.test(value);
}

export function validateAvailabilitySlot(input: {
  weekday: number;
  startTime: string;
  endTime: string;
  durationMin?: number;
  locationType?: string;
}): string | null {
  if (!isValidWeekday(input.weekday)) return 'weekday must be 0 (Sun) through 6 (Sat)';
  if (!isValidTimeSlot(input.startTime)) return 'startTime must be HH:MM (24h)';
  if (!isValidTimeSlot(input.endTime)) return 'endTime must be HH:MM (24h)';
  if (input.startTime >= input.endTime) return 'endTime must be after startTime';
  if (
    input.locationType &&
    !CARE_AVAILABILITY_LOCATION_TYPES.includes(
      input.locationType as CareAvailabilityLocationType
    )
  ) {
    return 'locationType must be church, online, or room';
  }
  const duration = input.durationMin ?? 45;
  if (!Number.isInteger(duration) || duration < 15 || duration > 240) {
    return 'durationMin must be between 15 and 240';
  }
  return null;
}

export function serializeCareAvailability(row: {
  id: string;
  userId: string;
  weekday: number;
  startTime: string;
  endTime: string;
  durationMin: number;
  locationType: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  user?: { id: string; firstName: string; lastName: string } | null;
}) {
  return {
    id: row.id,
    userId: row.userId,
    weekday: row.weekday,
    startTime: row.startTime,
    endTime: row.endTime,
    durationMin: row.durationMin,
    locationType: row.locationType,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    caregiver: row.user
      ? {
          id: row.user.id,
          name: `${row.user.firstName} ${row.user.lastName}`.trim(),
        }
      : null,
  };
}

export async function listCareAvailability(options?: {
  userId?: string;
  activeOnly?: boolean;
}) {
  const where: { userId?: string; isActive?: boolean } = {};
  if (options?.userId) where.userId = options.userId;
  if (options?.activeOnly !== false) where.isActive = true;

  const rows = await db.careAvailability.findMany({
    where,
    include: {
      user: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: [{ weekday: 'asc' }, { startTime: 'asc' }],
  });

  return rows.map(serializeCareAvailability);
}

export async function upsertCareAvailability(input: {
  userId: string;
  slots: Array<{
    id?: string;
    weekday: number;
    startTime: string;
    endTime: string;
    durationMin?: number;
    locationType?: string;
    isActive?: boolean;
  }>;
}) {
  const results = [];

  for (const slot of input.slots) {
    const error = validateAvailabilitySlot({
      weekday: slot.weekday,
      startTime: slot.startTime,
      endTime: slot.endTime,
      durationMin: slot.durationMin,
      locationType: slot.locationType,
    });
    if (error) {
      throw new Error(error);
    }

    const data = {
      userId: input.userId,
      weekday: slot.weekday,
      startTime: slot.startTime,
      endTime: slot.endTime,
      durationMin: slot.durationMin ?? 45,
      locationType: slot.locationType || 'church',
      isActive: slot.isActive ?? true,
    };

    if (slot.id) {
      const existing = await db.careAvailability.findFirst({
        where: { id: slot.id, userId: input.userId },
      });
      if (!existing) throw new Error('Availability slot not found');
      const row = await db.careAvailability.update({
        where: { id: slot.id },
        data,
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
        },
      });
      results.push(row);
    } else {
      const row = await db.careAvailability.create({
        data,
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
        },
      });
      results.push(row);
    }
  }

  return results.map(serializeCareAvailability);
}

function mapLocationType(value?: string | null): PastoralVisitLocationValue {
  if (value === 'online') return 'online';
  if (value === 'room' || value === 'church') return 'church';
  if (value && PASTORAL_VISIT_LOCATIONS.includes(value as PastoralVisitLocationValue)) {
    return value as PastoralVisitLocationValue;
  }
  return 'church';
}

export async function listMemberAppointments(memberId: string) {
  const rows = await db.pastoralVisit.findMany({
    where: { memberId },
    include: {
      assignedTo: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { scheduledAt: 'desc' },
    take: 50,
  });
  return rows.map(serializeMemberVisit);
}

export async function requestAppointment(input: {
  memberId: string;
  createdById: string;
  scheduledAt: Date;
  locationType?: string | null;
  locationNote?: string | null;
  assignedToId?: string | null;
  request?: Request;
}) {
  if (Number.isNaN(input.scheduledAt.getTime())) {
    throw new Error('Invalid scheduledAt');
  }

  if (input.assignedToId) {
    const assignee = await db.user.findUnique({
      where: { id: input.assignedToId },
      select: { id: true },
    });
    if (!assignee) throw new Error('Assigned caregiver not found');
  }

  const row = await createVisit({
    memberId: input.memberId,
    assignedToId: input.assignedToId || null,
    createdById: input.createdById,
    scheduledAt: input.scheduledAt,
    status: 'scheduled',
    locationType: mapLocationType(input.locationType),
    locationNote: input.locationNote,
    request: input.request,
  });

  return serializeMemberVisit(row);
}

export async function cancelOwnAppointment(input: {
  visitId: string;
  memberId: string;
  cancelledById: string;
  request?: Request;
}) {
  const visit = await db.pastoralVisit.findFirst({
    where: { id: input.visitId, memberId: input.memberId },
    include: {
      assignedTo: { select: { id: true, firstName: true, lastName: true } },
    },
  });
  if (!visit) return null;
  if (visit.status === 'cancelled' || visit.status === 'completed') {
    throw new Error('This appointment cannot be cancelled');
  }

  const updated = await db.pastoralVisit.update({
    where: { id: visit.id },
    data: { status: 'cancelled' },
    include: {
      assignedTo: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  if (updated.assignedToId && updated.assignedToId !== input.cancelledById) {
    await emitPastoralEvent({
      type: 'visit_scheduled',
      actorId: input.cancelledById,
      entityId: updated.id,
      recipientUserId: updated.assignedToId,
      request: input.request,
    });
  }

  return serializeMemberVisit(updated);
}
