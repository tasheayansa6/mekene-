import { assignmentWindow } from './conflicts';

export const VOLUNTEER_CANNOT_EDIT_HOURS = true;

/** Hours from validated check-in/out, else scheduled window when present. */
export function computeHoursMinutes(input: {
  checkInAt: Date | null;
  checkOutAt: Date | null;
  scheduledAt: Date;
  endsAt: Date | null;
  attendanceStatus?: string | null;
}): number {
  if (input.attendanceStatus === 'absent' || input.attendanceStatus === 'excused') {
    return 0;
  }
  if (input.checkInAt && input.checkOutAt && input.checkOutAt > input.checkInAt) {
    return Math.max(
      0,
      Math.round((input.checkOutAt.getTime() - input.checkInAt.getTime()) / 60_000)
    );
  }
  if (input.checkInAt || input.attendanceStatus === 'present' || input.attendanceStatus === 'late') {
    const window = assignmentWindow(input.scheduledAt, input.endsAt);
    return Math.max(0, Math.round((window.end.getTime() - window.start.getTime()) / 60_000));
  }
  return 0;
}

export function assertNonNegativeHours(minutes: number): number {
  if (!Number.isFinite(minutes) || minutes < 0) return 0;
  return Math.round(minutes);
}

/**
 * Transparent participation — never labels a volunteer as unreliable.
 */
export function participationMetrics(input: {
  confirmed: number;
  completed: number;
  absent: number;
}) {
  const assigned = input.confirmed + input.completed + input.absent;
  const completed = input.completed;
  return {
    confirmedAssignments: input.confirmed,
    completedAssignments: completed,
    absentAssignments: input.absent,
    assignedTotal: assigned,
    completionRatio: assigned > 0 ? completed / assigned : null,
  };
}
