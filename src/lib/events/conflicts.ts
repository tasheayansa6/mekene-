import { db } from '@/lib/db';
import { findLocationConflicts } from './registration';

export type ConflictSeverity = 'error' | 'warning';

export type SchedulingConflict = {
  type: 'venue' | 'resource' | 'volunteer' | 'capacity';
  severity: ConflictSeverity;
  message: string;
  relatedId?: string;
  relatedTitle?: string;
};

/** Venue double-booking for the same location/time window. */
export async function checkVenueConflicts(input: {
  locationId: string | null | undefined;
  startAt: Date;
  endAt: Date;
  excludeEventId?: string;
}): Promise<SchedulingConflict[]> {
  const rows = await findLocationConflicts(input);
  return rows.map((row) => ({
    type: 'venue' as const,
    severity: 'error' as const,
    message: `Venue conflict with "${row.title}" (${row.startAt.toISOString()}–${row.endAt.toISOString()}).`,
    relatedId: row.id,
    relatedTitle: row.title,
  }));
}

/** Event capacity must not exceed venue capacity unless overridden. */
export async function checkVenueCapacity(input: {
  locationId: string | null | undefined;
  capacity: number | null | undefined;
  allowOverVenueCapacity?: boolean;
}): Promise<SchedulingConflict[]> {
  if (!input.locationId || input.capacity == null) return [];
  if (input.allowOverVenueCapacity) return [];
  const venue = await db.eventLocation.findUnique({
    where: { id: input.locationId },
    select: { id: true, name: true, capacity: true },
  });
  if (!venue?.capacity) return [];
  if (input.capacity > venue.capacity) {
    return [
      {
        type: 'capacity',
        severity: 'error',
        message: `Event capacity (${input.capacity}) exceeds venue capacity (${venue.capacity}) for ${venue.name}. Enable allowOverVenueCapacity to override.`,
        relatedId: venue.id,
        relatedTitle: venue.name,
      },
    ];
  }
  return [];
}

/** Resource reservations overlapping the same window. */
export async function checkResourceConflicts(input: {
  resourceId: string;
  startAt: Date;
  endAt: Date;
  quantity?: number;
  excludeReservationId?: string;
}): Promise<SchedulingConflict[]> {
  const resource = await db.bookableResource.findUnique({
    where: { id: input.resourceId },
    select: { id: true, name: true, quantity: true, status: true },
  });
  if (!resource) {
    return [{ type: 'resource', severity: 'error', message: 'Resource not found.' }];
  }
  if (resource.status === 'maintenance' || resource.status === 'unavailable') {
    return [
      {
        type: 'resource',
        severity: 'error',
        message: `"${resource.name}" is ${resource.status}.`,
        relatedId: resource.id,
        relatedTitle: resource.name,
      },
    ];
  }
  const qty = input.quantity ?? 1;
  const overlaps = await db.resourceReservation.findMany({
    where: {
      resourceId: input.resourceId,
      status: { in: ['pending', 'confirmed'] },
      ...(input.excludeReservationId ? { id: { not: input.excludeReservationId } } : {}),
      startAt: { lt: input.endAt },
      endAt: { gt: input.startAt },
    },
    select: { id: true, quantity: true, event: { select: { title: true } } },
  });
  const reserved = overlaps.reduce((sum, row) => sum + row.quantity, 0);
  if (reserved + qty > resource.quantity) {
    const other = overlaps[0]?.event?.title;
    return [
      {
        type: 'resource',
        severity: 'error',
        message: other
          ? `"${resource.name}" is already reserved for "${other}" during this time.`
          : `"${resource.name}" does not have enough available quantity for this window.`,
        relatedId: resource.id,
        relatedTitle: resource.name,
      },
    ];
  }
  return [];
}

/** Volunteer already assigned to another event in the same window. */
export async function checkVolunteerConflicts(input: {
  memberId: string;
  startAt: Date;
  endAt: Date;
  excludeAssignmentId?: string;
}): Promise<SchedulingConflict[]> {
  const rows = await db.serviceAssignment.findMany({
    where: {
      memberId: input.memberId,
      status: { in: ['proposed', 'assigned', 'confirmed'] },
      ...(input.excludeAssignmentId ? { id: { not: input.excludeAssignmentId } } : {}),
      scheduledAt: { lt: input.endAt },
      OR: [{ endsAt: null }, { endsAt: { gt: input.startAt } }],
    },
    include: {
      event: { select: { id: true, title: true, startAt: true, endAt: true } },
      member: {
        select: {
          displayName: true,
          preferredName: true,
          user: { select: { firstName: true, lastName: true } },
        },
      },
    },
    take: 10,
  });

  const conflicts: SchedulingConflict[] = [];
  for (const row of rows) {
    const eventStart = row.event?.startAt ?? row.scheduledAt;
    const eventEnd = row.event?.endAt ?? row.endsAt ?? new Date(row.scheduledAt.getTime() + 2 * 60 * 60 * 1000);
    if (eventStart < input.endAt && eventEnd > input.startAt) {
      const name =
        row.member.preferredName ||
        row.member.displayName ||
        [row.member.user.firstName, row.member.user.lastName].filter(Boolean).join(' ') ||
        'Volunteer';
      conflicts.push({
        type: 'volunteer',
        severity: 'warning',
        message: `${name} is already assigned to "${row.event?.title || row.roleName}" at this time.`,
        relatedId: row.id,
        relatedTitle: row.event?.title,
      });
    }
  }
  return conflicts;
}

/** Aggregate venue + capacity checks for event create/update. */
export async function validateEventScheduling(input: {
  locationId?: string | null;
  startAt: Date;
  endAt: Date;
  capacity?: number | null;
  allowOverVenueCapacity?: boolean;
  excludeEventId?: string;
  allowVenueConflict?: boolean;
}): Promise<{ ok: true; warnings: SchedulingConflict[] } | { ok: false; errors: SchedulingConflict[] }> {
  const venue = await checkVenueConflicts({
    locationId: input.locationId,
    startAt: input.startAt,
    endAt: input.endAt,
    excludeEventId: input.excludeEventId,
  });
  const capacity = await checkVenueCapacity({
    locationId: input.locationId,
    capacity: input.capacity,
    allowOverVenueCapacity: input.allowOverVenueCapacity,
  });

  const errors = [
    ...(input.allowVenueConflict ? [] : venue),
    ...capacity,
  ];
  const warnings = input.allowVenueConflict ? venue : [];

  if (errors.length) return { ok: false, errors };
  return { ok: true, warnings };
}
