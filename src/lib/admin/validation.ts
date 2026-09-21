import { z } from 'zod';
import { formatZodErrors, passwordSchema } from '@/lib/auth/validation';
import { emailSchema } from '@/lib/auth/validation';

export { formatZodErrors };

const contentStatus = z.enum(['draft', 'published', 'archived']);

export const paginationSchema = z.object({
  q: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().trim().max(40).optional(),
  dir: z.enum(['asc', 'desc']).optional(),
});

export const ministryListSchema = paginationSchema.extend({
  status: contentStatus.optional(),
  category: z.string().trim().max(80).optional(),
  active: z.enum(['true', 'false']).optional(),
});

export const ministryWriteSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  slug: z
    .string()
    .trim()
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers, and hyphens')
    .optional(),
  description: z.string().trim().max(4000).nullable().optional(),
  leaderName: z.string().trim().max(120).nullable().optional(),
  category: z.string().trim().max(80).nullable().optional(),
  imageUrl: z.string().trim().url('Invalid URL').or(z.literal('')).nullable().optional(),
  status: contentStatus.optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
  leaderUserId: z.string().uuid().nullable().optional(),
});

export const leaderListSchema = paginationSchema.extend({
  status: contentStatus.optional(),
  active: z.enum(['true', 'false']).optional(),
  positionId: z.string().uuid().optional(),
});

export const leaderWriteSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(80),
  lastName: z.string().trim().min(1, 'Last name is required').max(80),
  slug: z
    .string()
    .trim()
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers, and hyphens')
    .nullable()
    .optional(),
  title: z.string().trim().max(120).nullable().optional(),
  bio: z.string().trim().max(4000).nullable().optional(),
  photoUrl: z.string().trim().url('Invalid URL').or(z.literal('')).nullable().optional(),
  email: z.string().email().or(z.literal('')).nullable().optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  status: contentStatus.optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
  positionId: z.string().uuid().nullable().optional(),
});

export const positionWriteSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(120),
  description: z.string().trim().max(2000).nullable().optional(),
  sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
  isActive: z.boolean().optional(),
});

export const bulkActionSchema = z.object({
  action: z.enum([
    'activate',
    'deactivate',
    'archive',
    'delete',
    'publish',
    'unpublish',
  ]),
  ids: z.array(z.string().min(1)).min(1).max(100),
});

export const settingsPatchSchema = z.object({
  timezone: z.string().trim().min(1).max(80).optional(),
  defaultLanguage: z.enum(['en', 'am']).optional(),
  maintenanceMode: z.boolean().optional(),
  prayerGuestSubmission: z.boolean().optional(),
  prayerPublicIndex: z.boolean().optional(),
  prayerEmailConfirmation: z.boolean().optional(),
  prayerRetentionDays: z.number().int().min(1).max(3650).nullable().optional(),
  membershipNumberPrefix: z
    .string()
    .trim()
    .min(1)
    .max(8)
    .regex(/^[A-Za-z0-9]+$/, 'Prefix may only include letters and numbers.')
    .optional(),
});

export const adminCreateUserSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: emailSchema,
  phone: z.string().trim().max(40).optional().or(z.literal('')),
  password: passwordSchema,
  roleSlug: z.string().min(1),
});

export const searchSchema = z.object({
  q: z.string().trim().min(1).max(80),
});

export const TIMEZONES = [
  'Africa/Addis_Ababa',
  'Africa/Nairobi',
  'UTC',
  'Europe/London',
  'America/New_York',
] as const;
