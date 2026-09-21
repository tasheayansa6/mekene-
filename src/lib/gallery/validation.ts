import { z } from 'zod';
import { paginationSchema } from '@/lib/admin/validation';
import { formatZodErrors } from '@/lib/auth/validation';
import { GALLERY_STATUSES } from './status';

export { formatZodErrors };

export const galleryStatusSchema = z.enum(GALLERY_STATUSES);
export const mediaTypeSchema = z.enum(['photo', 'video']);

export const publicGalleryListSchema = paginationSchema.omit({ sort: true, dir: true }).extend({
  q: z.string().trim().max(120).optional(),
  search: z.string().trim().max(120).optional(),
  category: z.string().trim().max(80).optional(),
  ministry: z.string().trim().max(80).optional(),
  event: z.string().trim().max(80).optional(),
  type: mediaTypeSchema.optional(),
  featured: z.enum(['true', 'false']).optional(),
  from: z.string().trim().max(40).optional(),
  to: z.string().trim().max(40).optional(),
  sort: z.enum(['newest', 'oldest', 'featured']).optional(),
});

export const publicMediaListSchema = paginationSchema.omit({ sort: true, dir: true }).extend({
  q: z.string().trim().max(120).optional(),
  search: z.string().trim().max(120).optional(),
  album: z.string().trim().max(80).optional(),
  type: mediaTypeSchema.optional(),
  ministry: z.string().trim().max(80).optional(),
  event: z.string().trim().max(80).optional(),
  featured: z.enum(['true', 'false']).optional(),
  sort: z.enum(['newest', 'oldest', 'featured']).optional(),
});

export const adminAlbumListSchema = paginationSchema.extend({
  status: galleryStatusSchema.optional(),
  category: z.string().trim().max(80).optional(),
  ministry: z.string().trim().max(80).optional(),
  event: z.string().trim().max(80).optional(),
  featured: z.enum(['true', 'false']).optional(),
});

export const adminMediaListSchema = paginationSchema.extend({
  status: galleryStatusSchema.optional(),
  type: mediaTypeSchema.optional(),
  album: z.string().trim().max(80).optional(),
  featured: z.enum(['true', 'false']).optional(),
});

export const albumWriteSchema = z
  .object({
    title: z.string().trim().min(1).max(180),
    slug: z.string().trim().max(80).nullable().optional(),
    description: z.string().trim().max(8000).nullable().optional(),
    categoryId: z.string().trim().max(80).nullable().optional(),
    eventId: z.string().trim().max(80).nullable().optional(),
    ministryId: z.string().trim().max(80).nullable().optional(),
    albumDate: z.string().trim().max(40).nullable().optional(),
    coverImageUrl: z.string().trim().max(500).nullable().optional(),
    coverImageAlt: z.string().trim().max(180).nullable().optional(),
    status: galleryStatusSchema.optional(),
    isFeatured: z.boolean().optional(),
    seoTitle: z.string().trim().max(70).nullable().optional(),
    seoDescription: z.string().trim().max(160).nullable().optional(),
    publishAt: z.string().trim().max(40).nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.coverImageUrl && !data.coverImageAlt?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Cover image alt text is required.',
        path: ['coverImageAlt'],
      });
    }
  });

export const mediaWriteSchema = z
  .object({
    title: z.string().trim().min(1).max(180),
    slug: z.string().trim().max(80).nullable().optional(),
    description: z.string().trim().max(4000).nullable().optional(),
    mediaType: mediaTypeSchema,
    fileUrl: z.string().trim().max(500).nullable().optional(),
    thumbnailUrl: z.string().trim().max(500).nullable().optional(),
    externalUrl: z.string().trim().max(500).nullable().optional(),
    caption: z.string().trim().max(400).nullable().optional(),
    altText: z.string().trim().max(180).nullable().optional(),
    photographer: z.string().trim().max(120).nullable().optional(),
    takenAt: z.string().trim().max(40).nullable().optional(),
    status: galleryStatusSchema.optional(),
    isFeatured: z.boolean().optional(),
    sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
    sermonId: z.string().trim().max(80).nullable().optional(),
    eventId: z.string().trim().max(80).nullable().optional(),
    ministryId: z.string().trim().max(80).nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.mediaType === 'photo' && !data.fileUrl?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'A photo file is required.',
        path: ['fileUrl'],
      });
    }
    if (data.mediaType === 'video' && !data.externalUrl?.trim() && !data.sermonId?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'A YouTube/Vimeo URL or sermon link is required.',
        path: ['externalUrl'],
      });
    }
  });

export const mediaReorderSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(200),
});

export const galleryCategoryWriteSchema = z.object({
  name: z.string().trim().min(1).max(80),
  slug: z.string().trim().max(80).nullable().optional(),
  description: z.string().trim().max(400).nullable().optional(),
  sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
});

export const galleryBulkSchema = z.object({
  action: z.enum(['publish', 'unpublish', 'archive', 'delete', 'feature', 'unfeature']),
  ids: z.array(z.string().min(1)).min(1).max(100),
});
