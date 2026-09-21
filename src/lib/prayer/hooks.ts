/** Future notification consumers can subscribe to these types. No delivery in this phase. */
export const PRAYER_HOOK_TYPES = [
  'prayer_request.created',
  'prayer_request.assigned',
  'prayer_request.approved',
  'prayer_request.status_changed',
  'prayer_request.rejected',
  'prayer_request.archived',
] as const;

export type PrayerHookType = (typeof PRAYER_HOOK_TYPES)[number];
