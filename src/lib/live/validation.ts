import { z } from 'zod';
import { formatZodErrors } from '@/lib/auth/validation';
import { paginationSchema } from '@/lib/admin/validation';
import { LIVE_STATUSES } from './status';
import { isAllowedReaction } from './reactions';

export { formatZodErrors };

export const liveSessionWriteSchema = z.object({
  eventId: z.string().trim().min(1).max(80),
  title: z.string().trim().max(200).optional(),
  description: z.string().trim().max(4000).nullable().optional(),
  provider: z.enum(['youtube', 'facebook', 'external']).optional(),
  streamUrl: z.string().trim().url().or(z.literal('')).nullable().optional(),
  backupStreamUrl: z.string().trim().url().or(z.literal('')).nullable().optional(),
  visibility: z.enum(['public', 'members', 'private']).optional(),
  chatEnabled: z.boolean().optional(),
  prayerEnabled: z.boolean().optional(),
  attendanceEnabled: z.boolean().optional(),
  reactionsEnabled: z.boolean().optional(),
  pollsEnabled: z.boolean().optional(),
  scheduledStartAt: z.string().trim().max(40).optional(),
  scheduledEndAt: z.string().trim().max(40).nullable().optional(),
  timezone: z.string().trim().max(80).optional(),
  seoTitle: z.string().trim().max(160).nullable().optional(),
  seoDescription: z.string().trim().max(320).nullable().optional(),
});

export const liveSessionPatchSchema = liveSessionWriteSchema
  .omit({ eventId: true })
  .extend({
    thumbnailUrl: z.string().trim().url().or(z.literal('')).nullable().optional(),
  })
  .partial();

export const adminLiveListSchema = paginationSchema.extend({
  status: z.enum(LIVE_STATUSES).optional(),
});

export const liveChatPostSchema = z.object({
  body: z.string().trim().min(1).max(400),
});

export const liveChatModerationSchema = z.object({
  messageId: z.string().trim().min(1).max(80).optional(),
  action: z.enum(['hide', 'delete', 'mute']),
  reason: z.string().trim().max(400).nullable().optional(),
  targetUserId: z.string().trim().max(80).nullable().optional(),
});

export const livePrayerSubmitSchema = z.object({
  body: z.string().trim().min(5).max(2000),
  isPrivate: z.boolean().optional(),
  name: z.string().trim().max(80).optional(),
});

export const livePrayerPatchSchema = z.object({
  prayerId: z.string().trim().min(1).max(80),
  status: z.enum(['pending', 'reviewed', 'assigned', 'prayed', 'archived']),
});

export const liveReactionSchema = z.object({
  emoji: z.string().refine((value) => isAllowedReaction(value), 'Reaction not allowed.'),
});

export const livePollCreateSchema = z.object({
  question: z.string().trim().min(3).max(300),
  options: z.array(z.string().trim().min(1).max(120)).min(2).max(8),
});

export const livePollVoteSchema = z.object({
  optionId: z.string().trim().min(1).max(80),
});

export const liveAnnouncementSchema = z.object({
  body: z.string().trim().min(1).max(500),
  isPinned: z.boolean().optional(),
  expiresAt: z.string().trim().max(40).nullable().optional(),
});

export const liveRecordingSchema = z.object({
  sermonId: z.string().trim().min(1).max(80),
});

export const liveProgramActiveSchema = z.object({
  programItemId: z.string().trim().min(1).max(80),
  label: z.string().trim().max(160).nullable().optional(),
});

export const liveRemindersSchema = z.object({
  reminderOffsetsMinutes: z.array(z.coerce.number().int().min(1).max(7 * 24 * 60)).min(1).max(10),
});

export const livePresenceSchema = z.object({
  approximateViewers: z.coerce.number().int().min(0).max(1_000_000).optional(),
});
