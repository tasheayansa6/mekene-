import { enqueueCommunicationJob } from '@/lib/communications/service';
import { DEFAULT_ASSIGNMENT_REMINDER_OFFSETS } from './status';
import { VOLUNTEER_GENERIC_NOTIFY_MESSAGE } from './events';

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

export async function scheduleAssignmentReminders(input: {
  assignmentId: string;
  userId: string;
  scheduledAt: Date;
  createdById?: string | null;
  offsetsMinutes?: number[];
}) {
  const offsets = input.offsetsMinutes?.length
    ? input.offsetsMinutes
    : [...DEFAULT_ASSIGNMENT_REMINDER_OFFSETS];

  for (const offset of offsets) {
    if (!Number.isFinite(offset) || offset <= 0) continue;
    const scheduledAt = new Date(input.scheduledAt.getTime() - offset * 60_000);
    if (scheduledAt <= new Date()) continue;
    await enqueueCommunicationJob({
      type: 'volunteer_assignment_reminder',
      audience: 'volunteers',
      channels: ['in_app'],
      scheduledAt,
      createdById: input.createdById || null,
      idempotencyKey: `volunteer-reminder:${input.assignmentId}:${offset}`,
      payload: {
        title: 'Service reminder',
        message: `${VOLUNTEER_GENERIC_NOTIFY_MESSAGE} This assignment is in about ${formatOffset(offset)}.`,
        relatedUrl: '/member/volunteering/assignments',
        notificationType: 'system',
        transactional: true,
        userIds: [input.userId],
      },
    });
  }
}
