export const MEMBERSHIP_STATUSES = [
  'approved',
  'active',
  'inactive',
  'visitor',
  'transferred',
  'suspended',
  'deceased',
  'archived',
] as const;

export type MembershipStatusValue = (typeof MEMBERSHIP_STATUSES)[number];

export const APPLICATION_STATUSES = [
  'submitted',
  'under_review',
  'needs_information',
  'resubmitted',
  'approved',
  'rejected',
  'archived',
] as const;

export type ApplicationStatusValue = (typeof APPLICATION_STATUSES)[number];

export const DIRECTORY_VISIBILITIES = ['private', 'members_only', 'staff_only', 'public'] as const;
export type DirectoryVisibilityValue = (typeof DIRECTORY_VISIBILITIES)[number];

export const MEMBER_MINISTRY_STATUSES = ['interested', 'active', 'inactive'] as const;
export type MemberMinistryStatusValue = (typeof MEMBER_MINISTRY_STATUSES)[number];

export const OPEN_APPLICATION_STATUSES: ApplicationStatusValue[] = [
  'submitted',
  'under_review',
  'needs_information',
  'resubmitted',
];

export const CURRENT_MEMBER_STATUSES: MembershipStatusValue[] = ['approved', 'active'];

/** Applicant-facing labels. Internal codes stay off member APIs. */
export const APPLICANT_STATUS_LABELS: Record<ApplicationStatusValue, string> = {
  submitted: 'Submitted',
  under_review: 'Under Review',
  needs_information: 'Additional Information Requested',
  resubmitted: 'Submitted',
  approved: 'Approved',
  rejected: 'Not Approved',
  archived: 'Not Approved',
};

export const ADMIN_APPLICATION_LABELS: Record<ApplicationStatusValue, string> = {
  submitted: 'Submitted',
  under_review: 'Under Review',
  needs_information: 'Needs Information',
  resubmitted: 'Resubmitted',
  approved: 'Approved',
  rejected: 'Rejected',
  archived: 'Archived',
};

export const ADMIN_MEMBER_STATUS_LABELS: Record<MembershipStatusValue, string> = {
  approved: 'Approved',
  active: 'Active',
  inactive: 'Inactive',
  visitor: 'Visitor',
  transferred: 'Transferred',
  suspended: 'Suspended',
  deceased: 'Deceased',
  archived: 'Archived',
};

export const DIRECTORY_VISIBILITY_LABELS: Record<DirectoryVisibilityValue, string> = {
  private: 'Private',
  members_only: 'Members Only',
  staff_only: 'Staff Only',
  public: 'Public',
};

export function directoryVisibilityLabel(value: string): string {
  return DIRECTORY_VISIBILITY_LABELS[value as DirectoryVisibilityValue] || value;
}

const APPLICATION_TRANSITIONS: Record<ApplicationStatusValue, ApplicationStatusValue[]> = {
  submitted: ['under_review', 'needs_information', 'approved', 'rejected', 'archived'],
  under_review: ['needs_information', 'approved', 'rejected', 'archived'],
  needs_information: ['resubmitted', 'archived', 'rejected'],
  resubmitted: ['under_review', 'needs_information', 'approved', 'rejected', 'archived'],
  approved: [],
  rejected: ['archived'],
  archived: [],
};

const MEMBER_TRANSITIONS: Record<MembershipStatusValue, MembershipStatusValue[]> = {
  approved: ['active', 'inactive', 'visitor', 'transferred', 'suspended', 'archived'],
  active: ['inactive', 'visitor', 'transferred', 'suspended', 'deceased', 'archived'],
  inactive: ['active', 'visitor', 'suspended', 'archived'],
  visitor: ['active', 'inactive', 'archived'],
  transferred: ['active', 'archived'],
  suspended: ['active', 'inactive', 'archived'],
  deceased: ['archived'],
  archived: ['active', 'inactive'],
};

export function applicantStatusLabel(status: string): string {
  return APPLICANT_STATUS_LABELS[status as ApplicationStatusValue] || 'Submitted';
}

export function adminApplicationLabel(status: string): string {
  return ADMIN_APPLICATION_LABELS[status as ApplicationStatusValue] || status;
}

export function adminMemberStatusLabel(status: string): string {
  return ADMIN_MEMBER_STATUS_LABELS[status as MembershipStatusValue] || status;
}

export function canTransitionApplication(
  from: string,
  to: string
): boolean {
  const allowed = APPLICATION_TRANSITIONS[from as ApplicationStatusValue];
  if (!allowed) return false;
  return allowed.includes(to as ApplicationStatusValue);
}

export function canTransitionMembership(
  from: string,
  to: string
): boolean {
  if (from === to) return true;
  const allowed = MEMBER_TRANSITIONS[from as MembershipStatusValue];
  if (!allowed) return false;
  return allowed.includes(to as MembershipStatusValue);
}

export function isOpenApplication(status: string): boolean {
  return OPEN_APPLICATION_STATUSES.includes(status as ApplicationStatusValue);
}

export function isCurrentMember(status: string): boolean {
  return CURRENT_MEMBER_STATUSES.includes(status as MembershipStatusValue);
}
