import { z } from 'zod';
import { CMS_STATUSES } from '@/lib/content/status';
import { formatZodErrors, cmsStatusSchema } from '@/lib/content/validation';
import { paginationSchema } from '@/lib/admin/validation';
import { CHURCH_LANGUAGES } from './translations';

export { formatZodErrors };

export const cmsListSchema = paginationSchema.extend({
  status: cmsStatusSchema.optional(),
  category: z.string().trim().max(80).optional(),
  q: z.string().trim().max(120).optional(),
});

export const faqWriteSchema = z.object({
  question: z.string().trim().min(1).max(300),
  answer: z.string().trim().min(1).max(5000),
  category: z.string().trim().max(80).optional(),
  sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
  status: cmsStatusSchema.optional(),
  language: z.enum(CHURCH_LANGUAGES as unknown as [string, ...string[]]).optional(),
  publishAt: z.string().datetime().nullable().optional(),
});

export const testimonialWriteSchema = z.object({
  name: z.string().trim().min(1).max(120),
  content: z.string().trim().min(1).max(2000),
  photoUrl: z.string().trim().max(500).nullable().optional(),
  permissionGranted: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
  status: cmsStatusSchema.optional(),
  language: z.enum(CHURCH_LANGUAGES as unknown as [string, ...string[]]).optional(),
});

export const homepageSectionUpdateSchema = z.object({
  title: z.string().trim().max(180).nullable().optional(),
  subtitle: z.string().trim().max(280).nullable().optional(),
  body: z.string().trim().max(5000).nullable().optional(),
  configJson: z.string().trim().max(10_000).nullable().optional(),
  isEnabled: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
});

export const homepageBatchSchema = z.object({
  orderedIds: z.array(z.string().cuid()).min(1).optional(),
  sections: z
    .array(
      z.object({
        id: z.string().cuid(),
        data: homepageSectionUpdateSchema,
      })
    )
    .optional(),
});

export const menuItemSchema = z.object({
  id: z.string().optional(),
  label: z.string().trim().min(1).max(120),
  href: z.string().trim().min(1).max(500),
  parentId: z.string().nullable().optional(),
  sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
  isEnabled: z.boolean().optional(),
  openInNew: z.boolean().optional(),
});

export const menuReplaceSchema = z.object({
  items: z.array(menuItemSchema),
});

export const translationWriteSchema = z.object({
  entityType: z.string().trim().min(1).max(80),
  entityId: z.string().cuid(),
  language: z.enum(CHURCH_LANGUAGES as unknown as [string, ...string[]]),
  title: z.string().trim().max(180).nullable().optional(),
  excerpt: z.string().trim().max(400).nullable().optional(),
  content: z.string().trim().max(50_000).nullable().optional(),
  seoTitle: z.string().trim().max(70).nullable().optional(),
  seoDescription: z.string().trim().max(160).nullable().optional(),
  status: z.enum(['draft', 'in_review', 'approved', 'published', 'archived']).optional(),
});

export const translationPatchSchema = translationWriteSchema
  .omit({ entityType: true, entityId: true, language: true })
  .partial();

export const revisionListSchema = z.object({
  entityType: z.string().trim().min(1).max(80),
  entityId: z.string().cuid(),
});

export const cmsMenuLocationSchema = z.enum(['main', 'footer', 'mobile']);
