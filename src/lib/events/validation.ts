import { z } from 'zod';
import { paginationSchema } from '@/lib/admin/validation';
import { formatZodErrors } from '@/lib/auth/validation';
import { EVENT_STATUSES } from './status';
import { isValidTimeZone } from './timezone';

export { formatZodErrors };

export const eventStatusSchema = z.enum(EVENT_STATUSES);
export const recurrenceSchema = z.enum(['none', 'daily', 'weekly', 'monthly']);

export const publicEventListSchema = paginationSchema.omit({ sort: true, dir: true }).extend({
  q: z.string().trim().max(120).optional(),
  search: z.string().trim().max(120).optional(),
  category: z.string().trim().max(80).optional(),
  ministry: z.string().trim().max(80).optional(),
  location: z.string().trim().max(80).optional(),
  online: z.enum(['true', 'false']).optional(),
  upcoming: z.enum(['true', 'false']).optional(),
  when: z.enum(['upcoming', 'past', 'all']).optional(),
  featured: z.enum(['true', 'false']).optional(),
  from: z.string().trim().max(40).optional(),
  to: z.string().trim().max(40).optional(),
  sort: z.enum(['soonest', 'latest', 'newest']).optional(),
});

export const adminEventListSchema = paginationSchema.extend({
  status: eventStatusSchema.optional(),
  category: z.string().trim().max(80).optional(),
  ministry: z.string().trim().max(80).optional(),
  location: z.string().trim().max(80).optional(),
  featured: z.enum(['true', 'false']).optional(),
});

export const calendarQuerySchema = z.object({
  from: z.string().trim().min(8).max(40),
  to: z.string().trim().min(8).max(40),
});

export const eventWriteSchema = z
  .object({
    title: z.string().trim().min(1, 'Title is required').max(180),
    slug: z
      .string()
      .trim()
      .max(80)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers, and hyphens')
      .optional(),
    description: z.string().trim().max(20_000).nullable().optional(),
    shortDescription: z.string().trim().max(400).nullable().optional(),
    categoryId: z.string().min(1).nullable().optional(),
    ministryId: z.string().min(1).nullable().optional(),
    organizerLeaderId: z.string().min(1).nullable().optional(),
    organizerName: z.string().trim().max(120).nullable().optional(),
    locationId: z.string().min(1).nullable().optional(),
    isOnline: z.boolean().optional(),
    meetingUrl: z.string().trim().max(500).nullable().optional(),
    startAt: z.string().min(1, 'Start date is required'),
    endAt: z.string().min(1, 'End date is required'),
    timezone: z.string().trim().max(80).optional(),
    recurrence: recurrenceSchema.optional(),
    recurrenceInterval: z.coerce.number().int().min(1).max(12).optional(),
    recurrenceUntil: z.string().nullable().optional(),
    featuredImageUrl: z.string().trim().max(500).nullable().optional(),
    featuredImageAlt: z.string().trim().max(180).nullable().optional(),
    registrationRequired: z.boolean().optional(),
    registrationUrl: z.string().trim().max(500).nullable().optional(),
    capacity: z.preprocess(
      (value) => (value === '' ? null : value),
      z.coerce.number().int().min(1, 'Capacity must be a positive number').max(100_000).nullable().optional()
    ),
    allowOverVenueCapacity: z.boolean().optional(),
    isWorshipService: z.boolean().optional(),
    serviceLabel: z.string().trim().max(120).nullable().optional(),
    registrationDeadline: z.string().nullable().optional(),
    status: eventStatusSchema.optional(),
    isFeatured: z.boolean().optional(),
    allowVenueConflict: z.boolean().optional(),
    seoTitle: z.string().trim().max(70).nullable().optional(),
    seoDescription: z.string().trim().max(160).nullable().optional(),
    ogImageUrl: z.string().trim().max(500).nullable().optional(),
    publishAt: z.string().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.timezone && !isValidTimeZone(data.timezone)) {
      ctx.addIssue({ code: 'custom', path: ['timezone'], message: 'Choose a valid IANA timezone.' });
    }
    if (data.featuredImageUrl && !data.featuredImageAlt?.trim()) {
      ctx.addIssue({
        code: 'custom',
        path: ['featuredImageAlt'],
        message: 'Alt text is required when a featured image is set.',
      });
    }
  });

export const eventCategoryWriteSchema = z.object({
  name: z.string().trim().min(1).max(80),
  slug: z
    .string()
    .trim()
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  description: z.string().trim().max(400).nullable().optional(),
  sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
});

export const eventLocationWriteSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z
    .string()
    .trim()
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  address: z.string().trim().max(240).nullable().optional(),
  description: z.string().trim().max(400).nullable().optional(),
  latitude: z.coerce.number().min(-90).max(90).nullable().optional(),
  longitude: z.coerce.number().min(-180).max(180).nullable().optional(),
  mapUrl: z.string().trim().max(500).nullable().optional(),
  capacity: z.coerce.number().int().min(1).max(100_000).nullable().optional(),
  facilities: z.string().trim().max(1000).nullable().optional(),
  isActive: z.boolean().optional(),
});

export const programItemWriteSchema = z.object({
  title: z.string().trim().min(1).max(160),
  itemType: z.string().trim().max(40).optional(),
  description: z.string().trim().max(800).nullable().optional(),
  durationMinutes: z.coerce.number().int().min(1).max(480).nullable().optional(),
  responsibleLabel: z.string().trim().max(120).nullable().optional(),
  memberId: z.string().min(1).nullable().optional(),
  notes: z.string().trim().max(800).nullable().optional(),
  status: z.string().trim().max(40).optional(),
});

export const programReorderSchema = z.object({
  orderedIds: z.array(z.string().min(1)).min(1).max(100),
});

export const programMetaSchema = z.object({
  title: z.string().trim().max(160).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  isPublic: z.boolean().optional(),
});

export const resourceReservationSchema = z.object({
  resourceId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(1000).optional(),
  startAt: z.string().min(1),
  endAt: z.string().min(1),
  notes: z.string().trim().max(800).nullable().optional(),
});

export const bookableResourceWriteSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z
    .string()
    .trim()
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  resourceType: z.string().trim().max(40).optional(),
  quantity: z.coerce.number().int().min(1).max(10_000).optional(),
  status: z.enum(['available', 'reserved', 'in_use', 'maintenance', 'unavailable']).optional(),
  notes: z.string().trim().max(800).nullable().optional(),
  isActive: z.boolean().optional(),
});

export const eventCheckInSchema = z.object({
  reference: z.string().trim().max(40).optional(),
  registrationId: z.string().min(1).optional(),
}).refine((data) => Boolean(data.reference || data.registrationId), {
  message: 'Provide a registration reference or id.',
});

export const eventConflictQuerySchema = z.object({
  locationId: z.string().min(1).optional(),
  startAt: z.string().min(1),
  endAt: z.string().min(1),
  capacity: z.coerce.number().int().min(1).nullable().optional(),
  allowOverVenueCapacity: z.enum(['true', 'false']).optional(),
});

export const eventActionSchema = z.object({
  action: z.enum(['publish', 'unpublish', 'archive', 'cancel', 'complete']),
  ids: z.array(z.string().min(1)).min(1).max(50),
});
