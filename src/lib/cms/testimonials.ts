import { db } from '@/lib/db';
import { sanitizePlainText, isSafePublicUrl } from '@/lib/content/sanitize';
import { isPubliclyVisible, resolveStatusOnSave, type CmsStatusValue } from '@/lib/content/status';

export function isPublicTestimonial(
  item: {
    status: string;
    publishAt?: Date | null;
    publishedAt?: Date | null;
    permissionGranted: boolean;
  },
  now = new Date()
): boolean {
  return item.permissionGranted && isPubliclyVisible(item, now);
}

export async function listPublicTestimonials(options?: { language?: string }) {
  const now = new Date();
  const rows = await db.cmsTestimonial.findMany({
    where: {
      status: 'published',
      permissionGranted: true,
      ...(options?.language ? { language: options.language } : {}),
    },
    orderBy: [{ sortOrder: 'asc' }, { publishedAt: 'desc' }],
    select: {
      id: true,
      name: true,
      content: true,
      photoUrl: true,
      sortOrder: true,
      language: true,
      publishedAt: true,
      permissionGranted: true,
      status: true,
    },
  });
  return rows
    .filter((item) => isPublicTestimonial(item, now))
    .map(({ permissionGranted: _p, status: _s, ...rest }) => rest);
}

export async function listAdminTestimonials(options?: {
  q?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = options?.page || 1;
  const pageSize = options?.pageSize || 20;
  const where: Record<string, unknown> = {};
  if (options?.status) where.status = options.status;
  if (options?.q) {
    where.OR = [{ name: { contains: options.q } }, { content: { contains: options.q } }];
  }

  const [totalItems, rows] = await Promise.all([
    db.cmsTestimonial.count({ where }),
    db.cmsTestimonial.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        author: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    }),
  ]);

  return { totalItems, page, pageSize, rows };
}

export async function getAdminTestimonial(id: string) {
  return db.cmsTestimonial.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });
}

function sanitizePhotoUrl(value?: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!isSafePublicUrl(trimmed) && !trimmed.startsWith('/uploads/')) {
    throw new Error('unsafe-url');
  }
  return trimmed;
}

export async function createTestimonial(input: {
  name: string;
  content: string;
  photoUrl?: string | null;
  permissionGranted?: boolean;
  sortOrder?: number;
  status?: CmsStatusValue;
  language?: string;
  authorId: string;
}) {
  const resolved = resolveStatusOnSave({ status: input.status });

  return db.cmsTestimonial.create({
    data: {
      name: sanitizePlainText(input.name, 120),
      content: sanitizePlainText(input.content, 2000),
      photoUrl: sanitizePhotoUrl(input.photoUrl),
      permissionGranted: input.permissionGranted ?? false,
      sortOrder: input.sortOrder ?? 0,
      status: resolved.status,
      language: input.language ?? 'en',
      publishedAt: resolved.publishedAt,
      authorId: input.authorId,
    },
    include: {
      author: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });
}

export async function updateTestimonial(
  id: string,
  input: {
    name?: string;
    content?: string;
    photoUrl?: string | null;
    permissionGranted?: boolean;
    sortOrder?: number;
    status?: CmsStatusValue;
    language?: string;
  }
) {
  const existing = await db.cmsTestimonial.findUnique({ where: { id } });
  if (!existing) return null;

  const resolved = resolveStatusOnSave({
    status: input.status ?? (existing.status as CmsStatusValue),
  });

  return db.cmsTestimonial.update({
    where: { id },
    data: {
      name: input.name ? sanitizePlainText(input.name, 120) : undefined,
      content: input.content ? sanitizePlainText(input.content, 2000) : undefined,
      photoUrl: input.photoUrl !== undefined ? sanitizePhotoUrl(input.photoUrl) : undefined,
      permissionGranted: input.permissionGranted,
      sortOrder: input.sortOrder,
      status: input.status !== undefined ? resolved.status : undefined,
      language: input.language,
      publishedAt: input.status !== undefined ? resolved.publishedAt : undefined,
    },
    include: {
      author: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });
}
