import { db } from '@/lib/db';
import { ACTIVE_ASSIGNMENT_STATUSES } from './status';

/** Default duration when an assignment has no endsAt (2 hours). */
export const DEFAULT_ASSIGNMENT_DURATION_MS = 2 * 60 * 60 * 1000;

export function assignmentWindow(
  scheduledAt: Date,
  endsAt: Date | null | undefined,
  defaultMs = DEFAULT_ASSIGNMENT_DURATION_MS
): { start: Date; end: Date } {
  const start = scheduledAt;
  const end =
    endsAt && endsAt.getTime() > scheduledAt.getTime()
      ? endsAt
      : new Date(scheduledAt.getTime() + defaultMs);
  return { start, end };
}

/** Half-open style interval overlap: [aStart, aEnd) overlaps [bStart, bEnd). */
export function intervalsOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date
): boolean {
  return aStart.getTime() < bEnd.getTime() && bStart.getTime() < aEnd.getTime();
}

/**
 * Server-side conflict detection for service assignments.
 * Excludes declined/cancelled (and optionally a row being updated).
 */
export async function detectOverlappingAssignments(
  memberId: string,
  start: Date,
  end: Date,
  excludeId?: string
) {
  if (!(end.getTime() > start.getTime())) {
    return [];
  }

  const candidates = await db.serviceAssignment.findMany({
    where: {
      memberId,
      status: { in: [...ACTIVE_ASSIGNMENT_STATUSES] },
      ...(excludeId ? { id: { not: excludeId } } : {}),
      scheduledAt: { lt: end },
    },
    select: {
      id: true,
      eventId: true,
      memberId: true,
      roleName: true,
      scheduledAt: true,
      endsAt: true,
      status: true,
    },
    orderBy: { scheduledAt: 'asc' },
    take: 100,
  });

  return candidates.filter((row) => {
    const window = assignmentWindow(row.scheduledAt, row.endsAt);
    // Also require candidate start is before our end (already filtered) and end after our start
    return intervalsOverlap(start, end, window.start, window.end);
  });
}

export function filterOverlappingAssignments<
  T extends { scheduledAt: Date; endsAt: Date | null; id: string },
>(rows: T[], start: Date, end: Date, excludeId?: string): T[] {
  return rows.filter((row) => {
    if (excludeId && row.id === excludeId) return false;
    const window = assignmentWindow(row.scheduledAt, row.endsAt);
    return intervalsOverlap(start, end, window.start, window.end);
  });
}
