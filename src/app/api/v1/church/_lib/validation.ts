import { z } from 'zod';

// ============================================================
// Shared schemas
// ============================================================

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

const SOCIAL_PLATFORMS = [
  'facebook',
  'youtube',
  'telegram',
  'tiktok',
  'instagram',
  'x',
  'other',
] as const;

// ============================================================
// Church Profile
// ============================================================

export const churchProfileUpdateSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  shortName: z.string().nullable().optional(),
  nameNative: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  welcomeMessage: z.string().nullable().optional(),
  history: z.string().nullable().optional(),
  vision: z.string().nullable().optional(),
  mission: z.string().nullable().optional(),
  beliefs: z.string().nullable().optional(),
  coreValues: z.string().nullable().optional(),
  worshipInfo: z.string().nullable().optional(),
  logoUrl: z.string().url('Invalid URL format').nullable().optional(),
  faviconUrl: z.string().url('Invalid URL format').nullable().optional(),
  ogImageUrl: z.string().url('Invalid URL format').nullable().optional(),
  email: z
    .string()
    .email('Invalid email format')
    .nullable()
    .optional(),
  phone: z.string().nullable().optional(),
  website: z.string().url('Invalid URL format').nullable().optional(),
  denomination: z.string().nullable().optional(),
  language: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

export type ChurchProfileUpdateInput = z.infer<typeof churchProfileUpdateSchema>;

// ============================================================
// Service Schedule
// ============================================================

export const serviceScheduleCreateSchema = z.object({
  dayOfWeek: z.enum(DAYS_OF_WEEK, {
    errorMap: () => ({ message: 'Day must be Sunday through Saturday' }),
  }),
  serviceName: z.string().min(1, 'Service name is required'),
  startTime: z
    .string()
    .regex(timeRegex, 'Time must be in HH:MM format (24-hour)'),
  endTime: z
    .string()
    .regex(timeRegex, 'Time must be in HH:MM format (24-hour)')
    .nullable()
    .optional(),
  description: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  sortOrder: z.number().int().min(0).default(0),
});

export type ServiceScheduleCreateInput = z.infer<
  typeof serviceScheduleCreateSchema
>;

export const serviceScheduleUpdateSchema = z.object({
  dayOfWeek: z
    .enum(DAYS_OF_WEEK, {
      errorMap: () => ({ message: 'Day must be Sunday through Saturday' }),
    })
    .optional(),
  serviceName: z.string().min(1, 'Service name is required').optional(),
  startTime: z
    .string()
    .regex(timeRegex, 'Time must be in HH:MM format (24-hour)')
    .optional(),
  endTime: z
    .string()
    .regex(timeRegex, 'Time must be in HH:MM format (24-hour)')
    .nullable()
    .optional(),
  description: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export type ServiceScheduleUpdateInput = z.infer<
  typeof serviceScheduleUpdateSchema
>;

// ============================================================
// Church Location
// ============================================================

export const churchLocationCreateSchema = z.object({
  name: z.string().min(1, 'Location name is required'),
  description: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  region: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z
    .string()
    .email('Invalid email format')
    .nullable()
    .optional(),
  isMainLocation: z.boolean().default(false),
});

export type ChurchLocationCreateInput = z.infer<
  typeof churchLocationCreateSchema
>;

export const churchLocationUpdateSchema = z.object({
  name: z.string().min(1, 'Location name is required').optional(),
  description: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  region: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z
    .string()
    .email('Invalid email format')
    .nullable()
    .optional(),
  isMainLocation: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export type ChurchLocationUpdateInput = z.infer<
  typeof churchLocationUpdateSchema
>;

// ============================================================
// Social Link
// ============================================================

export const socialLinkCreateSchema = z.object({
  platform: z.enum(SOCIAL_PLATFORMS, {
    errorMap: () => ({
      message:
        'Platform must be one of: facebook, youtube, telegram, tiktok, instagram, x, other',
    }),
  }),
  url: z.string().url('Invalid URL format'),
  displayName: z.string().nullable().optional(),
  sortOrder: z.number().int().min(0).default(0),
});

export type SocialLinkCreateInput = z.infer<typeof socialLinkCreateSchema>;

export const socialLinkUpdateSchema = z.object({
  platform: z
    .enum(SOCIAL_PLATFORMS, {
      errorMap: () => ({
        message:
          'Platform must be one of: facebook, youtube, telegram, tiktok, instagram, x, other',
      }),
    })
    .optional(),
  url: z.string().url('Invalid URL format').optional(),
  displayName: z.string().nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export type SocialLinkUpdateInput = z.infer<typeof socialLinkUpdateSchema>;

// ============================================================
// Helpers
// ============================================================

/** Convert Zod errors to the flat Record<string, string[]> format */
export function formatZodErrors(
  zodError: z.ZodError
): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  for (const issue of zodError.issues) {
    const path = issue.path.join('.');
    if (!errors[path]) {
      errors[path] = [];
    }
    errors[path].push(issue.message);
  }
  return errors;
}

/** Day-of-week order map for sorting: Sunday=0 ... Saturday=6 */
export const DAY_ORDER: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};
