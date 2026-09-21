import { z } from 'zod';
import { CMS_STATUSES } from '@/lib/content/status';
import { paginationSchema } from '@/lib/admin/validation';
import { formatZodErrors } from '@/lib/auth/validation';

export { formatZodErrors };

export const cmsStatusSchema = z.enum(CMS_STATUSES);

const slugSchema = z
  .string()
  .trim()
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers, and hyphens');

export const sermonContentTypeSchema = z.enum([
  'sermon',
  'bible_study',
  'devotion',
  'teaching',
  'testimony',
  'conference',
  'special',
]);

export const mediaAccessLevelSchema = z.enum(['public', 'members', 'restricted']);

export const publicSermonListSchema = paginationSchema.omit({ sort: true, dir: true }).extend({
  q: z.string().trim().max(120).optional(),
  search: z.string().trim().max(120).optional(),
  speaker: z.string().trim().max(80).optional(),
  series: z.string().trim().max(80).optional(),
  category: z.string().trim().max(80).optional(),
  contentType: sermonContentTypeSchema.optional(),
  mediaType: z.enum(['audio', 'video']).optional(),
  featured: z.enum(['true', 'false']).optional(),
  from: z.string().trim().max(40).optional(),
  to: z.string().trim().max(40).optional(),
  sort: z.enum(['newest', 'oldest', 'recent']).optional(),
});

export const adminSermonListSchema = paginationSchema.extend({
  q: z.string().trim().max(120).optional(),
  status: cmsStatusSchema.optional(),
  speaker: z.string().trim().max(80).optional(),
  series: z.string().trim().max(80).optional(),
  category: z.string().trim().max(80).optional(),
  contentType: sermonContentTypeSchema.optional(),
  accessLevel: mediaAccessLevelSchema.optional(),
  featured: z.enum(['true', 'false']).optional(),
});

/** @deprecated use publicSermonListSchema or adminSermonListSchema */
export const sermonListSchema = publicSermonListSchema;

export const scriptureSchema = z.object({
  book: z.string().trim().min(1).max(80),
  chapter: z.coerce.number().int().min(1).max(200).nullable().optional(),
  verseStart: z.coerce.number().int().min(1).max(200).nullable().optional(),
  verseEnd: z.coerce.number().int().min(1).max(200).nullable().optional(),
  label: z.string().trim().max(120).nullable().optional(),
  sortOrder: z.coerce.number().int().min(0).max(99).optional(),
});

export const sermonWriteSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(180),
  slug: slugSchema.optional(),
  description: z.string().trim().max(10_000).nullable().optional(),
  notes: z.string().trim().max(50_000).nullable().optional(),
  transcript: z.string().trim().max(200_000).nullable().optional(),
  speakerName: z.string().trim().max(120).nullable().optional(),
  speakerId: z.string().min(1).nullable().optional(),
  seriesId: z.string().min(1).nullable().optional(),
  categoryId: z.string().min(1).nullable().optional(),
  sermonDate: z.string().datetime(),
  thumbnailUrl: z.string().trim().max(500).nullable().optional(),
  thumbnailAlt: z.string().trim().max(180).nullable().optional(),
  audioUrl: z.string().trim().max(500).nullable().optional(),
  audioFileName: z.string().trim().max(180).nullable().optional(),
  audioMime: z.string().trim().max(120).nullable().optional(),
  audioSize: z.coerce.number().int().min(0).max(80_000_000).nullable().optional(),
  videoUrl: z.string().trim().max(500).nullable().optional(),
  notesFileUrl: z.string().trim().max(500).nullable().optional(),
  notesFileName: z.string().trim().max(180).nullable().optional(),
  notesFileMime: z.string().trim().max(120).nullable().optional(),
  notesFileSize: z.coerce.number().int().min(0).max(20_000_000).nullable().optional(),
  contentType: sermonContentTypeSchema.optional(),
  accessLevel: mediaAccessLevelSchema.optional(),
  durationSeconds: z.coerce.number().int().min(0).max(86_400).nullable().optional(),
  copyrightHolder: z.string().trim().max(180).nullable().optional(),
  license: z.string().trim().max(120).nullable().optional(),
  sourceAttribution: z.string().trim().max(500).nullable().optional(),
  status: cmsStatusSchema.optional(),
  isFeatured: z.boolean().optional(),
  seoTitle: z.string().trim().max(70).nullable().optional(),
  seoDescription: z.string().trim().max(160).nullable().optional(),
  ogImageUrl: z.string().trim().max(500).nullable().optional(),
  publishAt: z.string().datetime().nullable().optional(),
  scriptures: z.array(scriptureSchema).max(12).optional(),
}).superRefine((data, ctx) => {
  if (data.thumbnailUrl && !data.thumbnailAlt?.trim()) {
    ctx.addIssue({
      code: 'custom',
      path: ['thumbnailAlt'],
      message: 'Alt text is required when a thumbnail is set.',
    });
  }
});

export const seriesWriteSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: slugSchema.optional(),
  description: z.string().trim().max(4000).nullable().optional(),
  imageUrl: z.string().trim().max(500).nullable().optional(),
  imageAlt: z.string().trim().max(180).nullable().optional(),
  status: cmsStatusSchema.optional(),
  seoTitle: z.string().trim().max(70).nullable().optional(),
  seoDescription: z.string().trim().max(160).nullable().optional(),
  publishAt: z.string().datetime().nullable().optional(),
});

export const sermonCategoryWriteSchema = z.object({
  name: z.string().trim().min(1).max(80),
  slug: slugSchema.optional(),
  description: z.string().trim().max(400).nullable().optional(),
  sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
});

export const sermonActionSchema = z.object({
  action: z.enum(['publish', 'unpublish', 'archive', 'delete']),
  ids: z.array(z.string().min(1)).min(1).max(50),
  publishAt: z.string().datetime().optional(),
});
