import type { LiveSession } from '@prisma/client';
import type { CommunicationJob } from '@prisma/client';
import { enqueueCommunicationJob } from '@/lib/communications/service';

export async function scheduleLiveReminders(input: {
  session: Pick<LiveSession, 'id' | 'title' | 'slug' | 'scheduledStartAt' | 'eventId'>;
  reminderOffsetsMinutes: number[];
  createdById?: string | null;
}) {
  const jobs: CommunicationJob[] = [];
  for (const offset of input.reminderOffsetsMinutes) {
    if (!Number.isFinite(offset) || offset <= 0) continue;
    const scheduledAt = new Date(input.session.scheduledStartAt.getTime() - offset * 60_000);
    if (scheduledAt <= new Date()) continue;

    const job = await enqueueCommunicationJob({
      type: 'live_reminder',
      audience: 'members',
      eventId: input.session.eventId,
      channels: ['in_app', 'email'],
      scheduledAt,
      createdById: input.createdById || null,
      idempotencyKey: `live_reminder:${input.session.id}:${offset}`,
      payload: {
        title: `Live soon: ${input.session.title}`,
        message: `Join the live stream in about ${formatOffset(offset)}.`,
        relatedUrl: `/live/${input.session.slug}`,
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
