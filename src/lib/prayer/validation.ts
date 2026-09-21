import { z } from 'zod';
import { formatZodErrors } from '@/lib/auth/validation';
import { paginationSchema } from '@/lib/admin/validation';
import { PRAYER_STATUSES, PRAYER_VISIBILITIES } from './status';

export { formatZodErrors };

export const prayerSubmitSchema = z.object({
  title: z.string().trim().min(3, 'Please add a short title').max(180),
  content: z.string().trim().min(10, 'Prayer request must be at least 10 characters').max(8000),
  categoryId: z.string().trim().max(80).optional().nullable(),
  isAnonymous: z.boolean().optional().default(false),
  visibility: z.enum(PRAYER_VISIBILITIES).optional().default('private'),
  name: z.string().trim().max(80).optional().or(z.literal('')),
  email: z.string().email('Please enter a valid email address').optional().or(z.literal('')),
  captchaToken: z.string().trim().max(4000).optional().nullable(),
  website: z.string().max(200).optional(),
});

export const adminPrayerListSchema = paginationSchema.extend({
  status: z.enum(PRAYER_STATUSES).optional(),
  category: z.string().trim().max(80).optional(),
  visibility: z.enum(PRAYER_VISIBILITIES).optional(),
  assignedTo: z.string().trim().max(80).optional(),
  from: z.string().trim().max(40).optional(),
  to: z.string().trim().max(40).optional(),
});

export const publicPrayerListSchema = paginationSchema.extend({
  category: z.string().trim().max(80).optional(),
});

export const prayerAssignSchema = z.object({
  assignedToId: z.string().trim().min(1).max(80).nullable(),
});

export const prayerStatusPatchSchema = z.object({
  status: z.enum(PRAYER_STATUSES).optional(),
  categoryId: z.string().trim().max(80).nullable().optional(),
  requesterMessage: z.string().trim().max(2000).nullable().optional(),
});

export const prayerNoteSchema = z.object({
  body: z.string().trim().min(3, 'Note is required').max(4000),
});

export const prayerCategoryWriteSchema = z.object({
  name: z.string().trim().min(1).max(80),
  slug: z
    .string()
    .trim()
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers, and hyphens')
    .optional(),
  description: z.string().trim().max(400).nullable().optional(),
  sortOrder: z.coerce.number().int().min(0).max(999).optional(),
});

export const prayerPurgeSchema = z.object({
  confirm: z.literal(true),
});
