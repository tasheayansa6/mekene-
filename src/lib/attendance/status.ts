export const SESSION_STATUSES = ['draft', 'scheduled', 'open', 'closed', 'archived'] as const;
export type SessionStatusValue = (typeof SESSION_STATUSES)[number];

export const SESSION_TYPES = [
  'sunday_service',
  'worship',
  'bible_study',
  'prayer_meeting',
  'youth',
  'children',
  'conference',
  'ministry',
  'special_event',
  'other',
] as const;
export type SessionTypeValue = (typeof SESSION_TYPES)[number];

export const RECORD_STATUSES = ['present', 'absent', 'excused', 'late', 'cancelled'] as const;
export type RecordStatusValue = (typeof RECORD_STATUSES)[number];

export const CHECK_IN_METHODS = ['manual', 'self', 'admin', 'qr', 'imported'] as const;
export type CheckInMethodValue = (typeof CHECK_IN_METHODS)[number];

export const SESSION_STATUS_LABELS: Record<SessionStatusValue, string> = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  open: 'Open',
  closed: 'Closed',
  archived: 'Archived',
};

export const SESSION_TYPE_LABELS: Record<SessionTypeValue, string> = {
  sunday_service: 'Sunday Service',
  worship: 'Worship Service',
  bible_study: 'Bible Study',
  prayer_meeting: 'Prayer Meeting',
  youth: 'Youth',
  children: 'Children',
  conference: 'Conference',
  ministry: 'Ministry',
  special_event: 'Special Event',
  other: 'Other',
};

export const RECORD_STATUS_LABELS: Record<RecordStatusValue, string> = {
  present: 'Present',
  absent: 'Absent',
  excused: 'Excused',
  late: 'Late',
  cancelled: 'Cancelled',
};

export const METHOD_LABELS: Record<CheckInMethodValue, string> = {
  manual: 'Manual',
  self: 'Self check-in',
  admin: 'Admin check-in',
  qr: 'QR',
  imported: 'Imported',
};

const SESSION_TRANSITIONS: Record<SessionStatusValue, SessionStatusValue[]> = {
  draft: ['scheduled', 'open', 'archived'],
  scheduled: ['open', 'draft', 'archived'],
  open: ['closed', 'archived'],
  closed: ['open', 'archived'],
  archived: [],
};

export function canTransitionSession(from: string, to: string): boolean {
  if (from === to) return true;
  const allowed = SESSION_TRANSITIONS[from as SessionStatusValue];
  if (!allowed) return false;
  return allowed.includes(to as SessionStatusValue);
}

export function sessionStatusLabel(status: string): string {
  return SESSION_STATUS_LABELS[status as SessionStatusValue] || status;
}

export function sessionTypeLabel(type: string): string {
  return SESSION_TYPE_LABELS[type as SessionTypeValue] || type;
}

export function recordStatusLabel(status: string): string {
  return RECORD_STATUS_LABELS[status as RecordStatusValue] || status;
}

export function methodLabel(method: string): string {
  return METHOD_LABELS[method as CheckInMethodValue] || method;
}

/** Open sessions accept check-ins. Optional early/late window around startsAt/endsAt. */
export function isSessionAcceptingCheckIns(
  session: {
    status: string;
    startsAt: Date;
    endsAt: Date | null;
    allowSelfCheckIn?: boolean;
  },
  now = new Date(),
  options?: { requireSelfFlag?: boolean; earlyMinutes?: number; lateMinutes?: number }
): boolean {
  if (session.status !== 'open') return false;
  if (options?.requireSelfFlag && session.allowSelfCheckIn === false) return false;
  const early = (options?.earlyMinutes ?? 60) * 60_000;
  const late = (options?.lateMinutes ?? 30) * 60_000;
  const start = session.startsAt.getTime() - early;
  const end = (session.endsAt?.getTime() ?? session.startsAt.getTime() + 3 * 60 * 60_000) + late;
  const t = now.getTime();
  return t >= start && t <= end;
}
