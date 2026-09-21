import type { CommunicationJob } from '@prisma/client';
import { enqueueCommunicationJob } from '@/lib/communications/service';

/**
 * Schedule event reminder jobs using configurable lead times (minutes).
 * Uses the event start time as absolute UTC; display uses event.timezone elsewhere.
 */
export async function scheduleEventReminders(input: {
  eventId: string;
  title: string;
  startAt: Date;
  reminderOffsetsMinutes: number[];
  createdById?: string | null;
  relatedUrl?: string;
}) {
  const jobs: CommunicationJob[] = [];
  for (const offset of input.reminderOffsetsMinutes) {
    if (!Number.isFinite(offset) || offset <= 0) continue;
    const scheduledAt = new Date(input.startAt.getTime() - offset * 60_000);
    if (scheduledAt <= new Date()) continue;
    const job = await enqueueCommunicationJob({
      type: 'event_reminder',
      audience: 'members',
      eventId: input.eventId,
      channels: ['in_app', 'email'],
      scheduledAt,
      createdById: input.createdById || null,
      idempotencyKey: `event-reminder:${input.eventId}:${offset}`,
      payload: {
        title: `Reminder: ${input.title}`,
        message: `This event starts in about ${formatOffset(offset)}.`,
        relatedUrl: input.relatedUrl || `/events`,
        notificationType: 'event_reminder',
        transactional: false,
      },
    });
    jobs.push(job);
  }
  return jobs;
}

function formatOffset(minutes: number): string {
  if (minutes % (24 * 60) === 0) {
    const days = minutes / (24 * 60);
    return days === 1 ? '1 day' : `${days} days`;
  }
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return hours === 1 ? '1 hour' : `${hours} hours`;
  }
  return `${minutes} minutes`;
}
