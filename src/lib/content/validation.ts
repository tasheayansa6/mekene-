import { z } from 'zod';
import { CMS_STATUSES, RESERVED_PAGE_SLUGS } from './status';
import { formatZodErrors } from '@/lib/auth/validation';
import { paginationSchema } from '@/lib/admin/validation';

export { formatZodErrors };

export const cmsStatusSchema = z.enum(CMS_STATUSES);

const slugSchema = z
  .string()
  .trim()
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers, and hyphens');

export const contentListSchema = paginationSchema.extend({
  status: cmsStatusSchema.optional(),
  category: z.string().trim().max(80).optional(),
  tag: z.string().trim().max(80).optional(),
  featured: z.enum(['true', 'false']).optional(),
});

export const pageWriteSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(180),
  slug: slugSchema.optional(),
  excerpt: z.string().trim().max(400).nullable().optional(),
  content: z.string().trim().min(1, 'Content is required').max(50_000),
  featuredImageUrl: z.string().trim().max(500).nullable().optional(),
  featuredImageAlt: z.string().trim().max(180).nullable().optional(),
  status: cmsStatusSchema.optional(),
  isFeatured: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
  seoTitle: z.string().trim().max(70).nullable().optional(),
  seoDescription: z.string().trim().max(160).nullable().optional(),
  ogImageUrl: z.string().trim().max(500).nullable().optional(),
  publishAt: z.string().datetime().nullable().optional(),
});

export const newsWriteSchema = pageWriteSchema.extend({
  categoryId: z.string().cuid().nullable().optional(),
  tagIds: z.array(z.string().cuid()).max(12).optional(),
});

export const announcementWriteSchema = z.object({
  title: z.string().trim().min(1).max(180),
  slug: slugSchema.optional(),
  excerpt: z.string().trim().min(1, 'Short message is required').max(280),
  content: z.string().trim().min(1).max(20_000),
  priority: z.enum(['normal', 'important', 'urgent']).optional(),
  status: cmsStatusSchema.optional(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime().nullable().optional(),
  isFeatured: z.boolean().optional(),
  seoTitle: z.string().trim().max(70).nullable().optional(),
  seoDescription: z.string().trim().max(160).nullable().optional(),
  featuredImageUrl: z.string().trim().max(500).nullable().optional(),
  featuredImageAlt: z.string().trim().max(180).nullable().optional(),
  publishAt: z.string().datetime().nullable().optional(),
});

export const resourceWriteSchema = z.object({
  title: z.string().trim().min(1).max(180),
  slug: slugSchema.optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  content: z.string().trim().max(20_000).nullable().optional(),
  fileUrl: z.string().trim().max(500).nullable().optional(),
  fileName: z.string().trim().max(180).nullable().optional(),
  fileMime: z.string().trim().max(120).nullable().optional(),
  fileSize: z.coerce.number().int().min(0).max(20_000_000).nullable().optional(),
  thumbnailUrl: z.string().trim().max(500).nullable().optional(),
  thumbnailAlt: z.string().trim().max(180).nullable().optional(),
  externalUrl: z.string().trim().url().or(z.literal('')).nullable().optional(),
  accessLevel: z.enum(['public', 'members', 'restricted']).optional(),
  copyrightHolder: z.string().trim().max(180).nullable().optional(),
  license: z.string().trim().max(120).nullable().optional(),
  version: z.string().trim().max(40).nullable().optional(),
  status: cmsStatusSchema.optional(),
  isFeatured: z.boolean().optional(),
  seoTitle: z.string().trim().max(70).nullable().optional(),
  seoDescription: z.string().trim().max(160).nullable().optional(),
  categoryId: z.string().cuid().nullable().optional(),
  publishAt: z.string().datetime().nullable().optional(),
});

export const categoryWriteSchema = z.object({
  name: z.string().trim().min(1).max(80),
  slug: slugSchema.optional(),
  description: z.string().trim().max(400).nullable().optional(),
  scope: z.enum(['news', 'resource']),
  sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
});

export const tagWriteSchema = z.object({
  name: z.string().trim().min(1).max(40),
  slug: slugSchema.optional(),
});

export const searchSchema = z.object({
  q: z.string().trim().min(1).max(80),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
});

export const contentActionSchema = z.object({
  action: z.enum(['publish', 'unpublish', 'archive', 'delete', 'schedule']),
  ids: z.array(z.string().min(1)).min(1).max(50),
  publishAt: z.string().datetime().optional(),
});

export function assertPageSlugAllowed(slug: string) {
  if (RESERVED_PAGE_SLUGS.has(slug)) {
    throw new Error('reserved');
  }
}
