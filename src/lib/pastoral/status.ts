export const PASTORAL_CASE_STATUSES = [
  'open',
  'in_progress',
  'on_hold',
  'resolved',
  'closed',
] as const;

export type PastoralCaseStatusValue = (typeof PASTORAL_CASE_STATUSES)[number];

export const PASTORAL_PRIORITIES = ['low', 'normal', 'high'] as const;
export type PastoralPriorityValue = (typeof PASTORAL_PRIORITIES)[number];

export const PASTORAL_VISIT_STATUSES = [
  'scheduled',
  'confirmed',
  'completed',
  'cancelled',
  'no_show',
] as const;
export type PastoralVisitStatusValue = (typeof PASTORAL_VISIT_STATUSES)[number];

export const PASTORAL_VISIT_LOCATIONS = [
  'church',
  'member_home',
  'hospital',
  'other',
  'online',
] as const;
export type PastoralVisitLocationValue = (typeof PASTORAL_VISIT_LOCATIONS)[number];

export const PASTORAL_FOLLOWUP_STATUSES = [
  'pending',
  'in_progress',
  'completed',
  'cancelled',
] as const;
export type PastoralFollowUpStatusValue = (typeof PASTORAL_FOLLOWUP_STATUSES)[number];

export const PASTORAL_NOTE_VISIBILITIES = [
  'case_team',
  'pastoral_staff',
  'role_restricted',
] as const;
export type PastoralNoteVisibilityValue = (typeof PASTORAL_NOTE_VISIBILITIES)[number];

export const CASE_STATUS_LABELS: Record<PastoralCaseStatusValue, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  on_hold: 'On Hold',
  resolved: 'Resolved',
  closed: 'Closed',
};

export const PRIORITY_LABELS: Record<PastoralPriorityValue, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
};

export const VISIT_STATUS_LABELS: Record<PastoralVisitStatusValue, string> = {
  scheduled: 'Scheduled',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No Show',
};

export const VISIT_LOCATION_LABELS: Record<PastoralVisitLocationValue, string> = {
  church: 'Church',
  member_home: 'Member Home',
  hospital: 'Hospital',
  other: 'Other',
  online: 'Online',
};

export const FOLLOWUP_STATUS_LABELS: Record<PastoralFollowUpStatusValue, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const NOTE_VISIBILITY_LABELS: Record<PastoralNoteVisibilityValue, string> = {
  case_team: 'Case Team',
  pastoral_staff: 'Pastoral Staff',
  role_restricted: 'Role Restricted',
};

export function caseStatusLabel(status: string): string {
  return CASE_STATUS_LABELS[status as PastoralCaseStatusValue] || status;
}

export function priorityLabel(priority: string): string {
  return PRIORITY_LABELS[priority as PastoralPriorityValue] || priority;
}

export function visitStatusLabel(status: string): string {
  return VISIT_STATUS_LABELS[status as PastoralVisitStatusValue] || status;
}

export function visitLocationLabel(location: string): string {
  return VISIT_LOCATION_LABELS[location as PastoralVisitLocationValue] || location;
}

export function followUpStatusLabel(status: string): string {
  return FOLLOWUP_STATUS_LABELS[status as PastoralFollowUpStatusValue] || status;
}

export function noteVisibilityLabel(visibility: string): string {
  return NOTE_VISIBILITY_LABELS[visibility as PastoralNoteVisibilityValue] || visibility;
}

export const OPEN_CASE_STATUSES: PastoralCaseStatusValue[] = ['open', 'in_progress', 'on_hold'];
