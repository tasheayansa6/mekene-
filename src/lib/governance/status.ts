/** Configurable governance enums — do not hard-code church authority here. */

export const APPOINTMENT_STATUSES = ['active', 'ended', 'replaced'] as const;
export const COMMITTEE_STATUSES = ['active', 'inactive', 'archived'] as const;
export const COMMITTEE_MEMBER_STATUSES = ['active', 'ended', 'removed'] as const;

export const MEETING_TYPES = [
  'leadership',
  'board',
  'committee',
  'department',
  'ministry',
  'special',
  'general_assembly',
  'custom',
] as const;

export const MEETING_STATUSES = [
  'draft',
  'scheduled',
  'in_progress',
  'completed',
  'cancelled',
  'postponed',
] as const;

export const AGENDA_ITEM_STATUSES = [
  'proposed',
  'approved',
  'deferred',
  'completed',
  'removed',
] as const;

export const ATTENDANCE_STATUSES = [
  'invited',
  'present',
  'absent',
  'excused',
  'late',
] as const;

export const MINUTES_STATUSES = [
  'draft',
  'secretary_review',
  'chair_review',
  'approved',
  'locked',
  'amendment_pending',
] as const;

export const DECISION_STATUSES = [
  'proposed',
  'approved',
  'rejected',
  'deferred',
  'in_progress',
  'completed',
  'cancelled',
] as const;

export const RESOLUTION_STATUSES = [
  'draft',
  'proposed',
  'approved',
  'rejected',
  'superseded',
  'archived',
] as const;

export const VOTING_METHODS = [
  'simple_majority',
  'two_thirds',
  'unanimous',
  'custom',
] as const;

export const VOTE_CHOICES = ['approve', 'reject', 'abstain'] as const;

export const ACTION_ITEM_STATUSES = [
  'open',
  'in_progress',
  'blocked',
  'completed',
  'cancelled',
] as const;

export const POLICY_STATUSES = [
  'draft',
  'review',
  'approval',
  'published',
  'archived',
] as const;

export const DOCUMENT_ACCESS_LEVELS = [
  'public',
  'member_only',
  'leadership_only',
  'committee_only',
  'restricted',
] as const;

export const ADMIN_REQUEST_STATUSES = [
  'submitted',
  'assigned',
  'under_review',
  'approved',
  'rejected',
  'completed',
  'cancelled',
] as const;

export const ADMIN_REQUEST_PRIORITIES = ['normal', 'priority', 'urgent'] as const;

export const DEFAULT_TERM_REMINDER_DAYS = [30, 60, 90] as const;

export const DEFAULT_RESOLUTION_NUMBER_FORMAT = 'YEAR-NUMBER';

export function isOneOf<T extends string>(value: string, allowed: readonly T[]): value is T {
  return (allowed as readonly string[]).includes(value);
}
