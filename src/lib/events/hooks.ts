/** Future notification consumers (email, Telegram, push) can subscribe to these types. */
export const EVENT_HOOK_TYPES = [
  'event.created',
  'event.updated',
  'event.cancelled',
  'event.published',
  'event.starting_soon',
] as const;

export type EventHookType = (typeof EVENT_HOOK_TYPES)[number];
