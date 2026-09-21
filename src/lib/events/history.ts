import { db } from '@/lib/db';

const TRACKED_FIELDS = [
  'startAt',
  'endAt',
  'locationId',
  'capacity',
  'status',
  'organizerLeaderId',
  'organizerName',
  'ministryId',
  'title',
  'timezone',
  'allowOverVenueCapacity',
  'isWorshipService',
  'serviceLabel',
] as const;

export async function recordEventChanges(input: {
  eventId: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  changedById?: string | null;
}) {
  const rows: {
    eventId: string;
    field: string;
    oldValue: string | null;
    newValue: string | null;
    changedById: string | null;
  }[] = [];

  for (const field of TRACKED_FIELDS) {
    const oldRaw = input.before[field];
    const newRaw = input.after[field];
    const oldValue = serializeValue(oldRaw);
    const newValue = serializeValue(newRaw);
    if (oldValue === newValue) continue;
    rows.push({
      eventId: input.eventId,
      field,
      oldValue,
      newValue,
      changedById: input.changedById || null,
    });
  }

  if (!rows.length) return [];
  await db.eventChangeHistory.createMany({ data: rows });
  return rows;
}

function serializeValue(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'boolean' || typeof value === 'number') return String(value);
  return String(value);
}

export async function listEventHistory(eventId: string, take = 50) {
  return db.eventChangeHistory.findMany({
    where: { eventId },
    orderBy: { createdAt: 'desc' },
    take,
    include: {
      changedBy: { select: { id: true, email: true, firstName: true, lastName: true } },
    },
  });
}
