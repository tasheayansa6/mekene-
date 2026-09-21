export const PRAYER_STATUSES = [
  'new',
  'under_review',
  'assigned',
  'praying',
  'answered',
  'archived',
  'rejected',
] as const;

export type PrayerStatusValue = (typeof PRAYER_STATUSES)[number];

export const PRAYER_VISIBILITIES = ['private', 'public'] as const;
export type PrayerVisibilityValue = (typeof PRAYER_VISIBILITIES)[number];

export const MEMBER_STATUS_LABELS: Record<PrayerStatusValue, string> = {
  new: 'Received',
  under_review: 'Being Reviewed',
  assigned: 'Prayer Team Assigned',
  praying: 'Being Prayed For',
  answered: 'Answered',
  archived: 'Archived',
  rejected: 'Closed',
};

export const ADMIN_STATUS_LABELS: Record<PrayerStatusValue, string> = {
  new: 'New',
  under_review: 'Under Review',
  assigned: 'Assigned',
  praying: 'Praying',
  answered: 'Answered',
  archived: 'Archived',
  rejected: 'Rejected',
};

export const CLOSED_PUBLIC_STATUSES: PrayerStatusValue[] = ['rejected', 'archived'];

export function memberStatusLabel(status: string): string {
  return MEMBER_STATUS_LABELS[status as PrayerStatusValue] || 'Received';
}

export function adminStatusLabel(status: string): string {
  return ADMIN_STATUS_LABELS[status as PrayerStatusValue] || status;
}

export function isPubliclyListable(row: {
  visibility: string;
  publicApproved: boolean;
  status: string;
}): boolean {
  return (
    row.visibility === 'public' &&
    row.publicApproved === true &&
    !CLOSED_PUBLIC_STATUSES.includes(row.status as PrayerStatusValue)
  );
}
