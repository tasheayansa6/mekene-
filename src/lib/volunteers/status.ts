export const STAFF_STATUSES = [
  'active',
  'on_leave',
  'suspended',
  'inactive',
  'former',
] as const;
export type StaffStatusValue = (typeof STAFF_STATUSES)[number];

export const VOLUNTEER_STATUSES = [
  'interested',
  'applicant',
  'pending_review',
  'approved',
  'active',
  'temporarily_unavailable',
  'inactive',
  'suspended',
  'archived',
  'former',
] as const;
export type VolunteerStatusValue = (typeof VOLUNTEER_STATUSES)[number];

export const VOLUNTEER_APPLICATION_STATUSES = [
  'draft',
  'submitted',
  'under_review',
  'more_info',
  'approved',
  'rejected',
  'withdrawn',
] as const;
export type VolunteerApplicationStatusValue =
  (typeof VOLUNTEER_APPLICATION_STATUSES)[number];

export const SERVICE_ASSIGNMENT_STATUSES = [
  'proposed',
  'assigned',
  'confirmed',
  'declined',
  'completed',
  'absent',
  'replaced',
  'cancelled',
] as const;
export type ServiceAssignmentStatusValue =
  (typeof SERVICE_ASSIGNMENT_STATUSES)[number];

export const TRAINING_ENROLLMENT_STATUSES = [
  'enrolled',
  'attended',
  'completed',
  'did_not_complete',
  'cancelled',
] as const;
export type TrainingEnrollmentStatusValue =
  (typeof TRAINING_ENROLLMENT_STATUSES)[number];

export const SKILL_PROFICIENCIES = [
  'beginner',
  'intermediate',
  'advanced',
  'expert',
] as const;
export type SkillProficiencyValue = (typeof SKILL_PROFICIENCIES)[number];

export const VOLUNTEER_TASK_STATUSES = [
  'todo',
  'in_progress',
  'completed',
  'cancelled',
] as const;
export type VolunteerTaskStatusValue = (typeof VOLUNTEER_TASK_STATUSES)[number];

export const STAFF_STATUS_LABELS: Record<StaffStatusValue, string> = {
  active: 'Active',
  on_leave: 'On Leave',
  suspended: 'Suspended',
  inactive: 'Inactive',
  former: 'Former',
};

export const VOLUNTEER_STATUS_LABELS: Record<VolunteerStatusValue, string> = {
  interested: 'Interested',
  applicant: 'Applicant',
  pending_review: 'Pending Review',
  approved: 'Approved',
  active: 'Active',
  temporarily_unavailable: 'Temporarily Unavailable',
  inactive: 'Inactive',
  suspended: 'Suspended',
  archived: 'Archived',
  former: 'Former',
};

export const APPLICATION_STATUS_LABELS: Record<
  VolunteerApplicationStatusValue,
  string
> = {
  draft: 'Draft',
  submitted: 'Submitted',
  under_review: 'Under Review',
  more_info: 'More Info Needed',
  approved: 'Approved',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
};

export const ASSIGNMENT_STATUS_LABELS: Record<
  ServiceAssignmentStatusValue,
  string
> = {
  proposed: 'Proposed',
  assigned: 'Assigned',
  confirmed: 'Confirmed',
  declined: 'Declined',
  completed: 'Completed',
  absent: 'Absent',
  replaced: 'Replaced',
  cancelled: 'Cancelled',
};

export const ENROLLMENT_STATUS_LABELS: Record<
  TrainingEnrollmentStatusValue,
  string
> = {
  enrolled: 'Enrolled',
  attended: 'Attended',
  completed: 'Completed',
  did_not_complete: 'Did Not Complete',
  cancelled: 'Cancelled',
};

export const PROFICIENCY_LABELS: Record<SkillProficiencyValue, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  expert: 'Expert',
};

export const TASK_STATUS_LABELS: Record<VolunteerTaskStatusValue, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

/** Statuses that still block the member's calendar for conflict checks. */
export const ACTIVE_ASSIGNMENT_STATUSES: ServiceAssignmentStatusValue[] = [
  'proposed',
  'assigned',
  'confirmed',
];

/** Volunteer statuses that may be scheduled (not archived/suspended/etc). */
export const SCHEDULABLE_VOLUNTEER_STATUSES: VolunteerStatusValue[] = [
  'approved',
  'active',
];

export const ATTENDANCE_STATUSES = [
  'present',
  'late',
  'absent',
  'excused',
  'substitute',
] as const;
export type AttendanceStatusValue = (typeof ATTENDANCE_STATUSES)[number];

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatusValue, string> = {
  present: 'Present',
  late: 'Late',
  absent: 'Absent',
  excused: 'Excused',
  substitute: 'Substitute',
};

export const ONBOARDING_STATUSES = [
  'not_started',
  'in_progress',
  'completed',
  'blocked',
] as const;
export type OnboardingStatusValue = (typeof ONBOARDING_STATUSES)[number];

export const ONBOARDING_STATUS_LABELS: Record<OnboardingStatusValue, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  completed: 'Completed',
  blocked: 'Blocked',
};

export const VOLUNTEER_REQUEST_TYPES = [
  'ministry_transfer',
  'team_transfer',
  'leave',
  'schedule_change',
  'training',
  'replacement',
] as const;
export type VolunteerRequestTypeValue = (typeof VOLUNTEER_REQUEST_TYPES)[number];

export const VOLUNTEER_REQUEST_STATUSES = [
  'submitted',
  'approved',
  'rejected',
  'cancelled',
] as const;
export type VolunteerRequestStatusValue = (typeof VOLUNTEER_REQUEST_STATUSES)[number];

export const SUBSTITUTION_STATUSES = [
  'requested',
  'approved',
  'declined',
  'completed',
  'cancelled',
] as const;
export type SubstitutionStatusValue = (typeof SUBSTITUTION_STATUSES)[number];

export const TRAINING_PROGRESS_STATUSES = [
  'required',
  'enrolled',
  'in_progress',
  'completed',
  'expired',
] as const;
export type TrainingProgressStatusValue = (typeof TRAINING_PROGRESS_STATUSES)[number];

export const DEFAULT_ASSIGNMENT_REMINDER_OFFSETS = [10080, 4320, 1440] as const;

export function attendanceStatusLabel(status: string): string {
  return ATTENDANCE_STATUS_LABELS[status as AttendanceStatusValue] || status;
}

/** Enrollments that consume session capacity. */
export const SEATED_ENROLLMENT_STATUSES: TrainingEnrollmentStatusValue[] = [
  'enrolled',
  'attended',
  'completed',
];

export function staffStatusLabel(status: string): string {
  return STAFF_STATUS_LABELS[status as StaffStatusValue] || status;
}

export function volunteerStatusLabel(status: string): string {
  return VOLUNTEER_STATUS_LABELS[status as VolunteerStatusValue] || status;
}

export function applicationStatusLabel(status: string): string {
  return APPLICATION_STATUS_LABELS[status as VolunteerApplicationStatusValue] || status;
}

export function assignmentStatusLabel(status: string): string {
  return ASSIGNMENT_STATUS_LABELS[status as ServiceAssignmentStatusValue] || status;
}

export function enrollmentStatusLabel(status: string): string {
  return ENROLLMENT_STATUS_LABELS[status as TrainingEnrollmentStatusValue] || status;
}
