export type RecurrenceRule = 'none' | 'daily' | 'weekly' | 'monthly';

export interface RecurringEventInput {
  startAt: Date;
  endAt: Date;
  recurrence: RecurrenceRule;
  recurrenceInterval?: number;
  recurrenceUntil?: Date | null;
}

export interface EventOccurrence {
  startAt: Date;
  endAt: Date;
}

function addInterval(start: Date, recurrence: RecurrenceRule, interval: number, index: number) {
  const next = new Date(start.getTime());
  if (recurrence === 'daily') {
    next.setUTCDate(next.getUTCDate() + interval * index);
  } else if (recurrence === 'weekly') {
    next.setUTCDate(next.getUTCDate() + 7 * interval * index);
  } else if (recurrence === 'monthly') {
    const day = start.getUTCDate();
    next.setUTCDate(1);
    next.setUTCMonth(next.getUTCMonth() + interval * index);
    const last = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate();
    next.setUTCDate(Math.min(day, last));
    next.setUTCHours(start.getUTCHours(), start.getUTCMinutes(), start.getUTCSeconds(), start.getUTCMilliseconds());
  }
  return next;
}

export function expandOccurrences(
  input: RecurringEventInput,
  rangeStart: Date,
  rangeEnd: Date,
  max = 60
): EventOccurrence[] {
  const duration = Math.max(0, input.endAt.getTime() - input.startAt.getTime());
  const interval = Math.max(1, Math.min(input.recurrenceInterval || 1, 12));
  if (input.recurrence === 'none') {
    if (input.endAt < rangeStart || input.startAt > rangeEnd) return [];
    return [{ startAt: input.startAt, endAt: input.endAt }];
  }
  const until = input.recurrenceUntil && input.recurrenceUntil < rangeEnd ? input.recurrenceUntil : rangeEnd;
  const results: EventOccurrence[] = [];
  for (let index = 0; index < max; index += 1) {
    const startAt = addInterval(input.startAt, input.recurrence, interval, index);
    if (startAt > until) break;
    const endAt = new Date(startAt.getTime() + duration);
    if (endAt < rangeStart) continue;
    if (startAt > rangeEnd) break;
    results.push({ startAt, endAt });
  }
  return results;
}

export function recurrenceLabel(input: {
  recurrence: RecurrenceRule;
  recurrenceInterval?: number;
}) {
  const interval = input.recurrenceInterval || 1;
  if (input.recurrence === 'none') return null;
  if (input.recurrence === 'daily') return interval === 1 ? 'Every day' : `Every ${interval} days`;
  if (input.recurrence === 'weekly') return interval === 1 ? 'Every week' : `Every ${interval} weeks`;
  if (input.recurrence === 'monthly') return interval === 1 ? 'Every month' : `Every ${interval} months`;
  return null;
}

export function toRRule(input: RecurringEventInput) {
  if (input.recurrence === 'none') return null;
  const freq = input.recurrence.toUpperCase();
  const interval = Math.max(1, input.recurrenceInterval || 1);
  let rule = `FREQ=${freq};INTERVAL=${interval}`;
  if (input.recurrenceUntil) {
    const until = input.recurrenceUntil.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
    rule += `;UNTIL=${until}`;
  }
  return rule;
}
