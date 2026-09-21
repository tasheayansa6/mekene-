import { db } from '@/lib/db';
import { sanitizePlainText } from '@/lib/content/sanitize';
import { isPubliclyVisible, publicStatusWhere, resolveStatusOnSave, type CmsStatusValue } from '@/lib/content/status';
import { parseDate } from '@/lib/content/admin-write';

export async function listAdminFaqs(options?: {
  q?: string;
  status?: string;
  category?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = options?.page || 1;
  const pageSize = options?.pageSize || 20;
  const where: Record<string, unknown> = {};
  if (options?.status) where.status = options.status;
  if (options?.category) where.category = options.category;
  if (options?.q) {
    where.OR = [
      { question: { contains: options.q } },
      { answer: { contains: options.q } },
    ];
  }

  const [totalItems, rows] = await Promise.all([
    db.cmsFaq.count({ where }),
    db.cmsFaq.findMany({
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

export async function listPublicFaqs(options?: { category?: string; language?: string }) {
  const now = new Date();
  try {
    const rows = await db.cmsFaq.findMany({
      where: {
        AND: [
          publicStatusWhere(now),
          ...(options?.category ? [{ category: options.category }] : []),
          ...(options?.language ? [{ language: options.language }] : []),
        ],
      },
      orderBy: [{ sortOrder: 'asc' }, { publishedAt: 'desc' }],
      select: {
        id: true,
        question: true,
        answer: true,
        category: true,
        sortOrder: true,
        language: true,
        publishedAt: true,
      },
    });
    return rows.filter((item) => isPubliclyVisible(item, now));
  } catch {
    return [];
  }
}

export async function getAdminFaq(id: string) {
  return db.cmsFaq.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });
}

export async function createFaq(input: {
  question: string;
  answer: string;
  category?: string;
  sortOrder?: number;
  status?: CmsStatusValue;
  language?: string;
  publishAt?: string | null;
  authorId: string;
}) {
  const publishAt = parseDate(input.publishAt);
  const resolved = resolveStatusOnSave({ status: input.status, publishAt });

  return db.cmsFaq.create({
    data: {
      question: sanitizePlainText(input.question, 300),
      answer: sanitizePlainText(input.answer, 5000),
      category: input.category ? sanitizePlainText(input.category, 80) : 'general',
      sortOrder: input.sortOrder ?? 0,
      status: resolved.status,
      language: input.language ?? 'en',
      publishAt,
      publishedAt: resolved.publishedAt,
      authorId: input.authorId,
    },
    include: {
      author: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });
}

export async function updateFaq(
  id: string,
  input: {
    question?: string;
    answer?: string;
    category?: string;
    sortOrder?: number;
    status?: CmsStatusValue;
    language?: string;
    publishAt?: string | null;
  }
) {
  const existing = await db.cmsFaq.findUnique({ where: { id } });
  if (!existing) return null;

  const publishAt =
    input.publishAt !== undefined ? parseDate(input.publishAt) : existing.publishAt;
  const resolved = resolveStatusOnSave({
    status: input.status ?? (existing.status as CmsStatusValue),
    publishAt,
  });

  return db.cmsFaq.update({
    where: { id },
    data: {
      question: input.question ? sanitizePlainText(input.question, 300) : undefined,
      answer: input.answer ? sanitizePlainText(input.answer, 5000) : undefined,
      category: input.category ? sanitizePlainText(input.category, 80) : undefined,
      sortOrder: input.sortOrder,
      status: input.status !== undefined ? resolved.status : undefined,
      language: input.language,
      publishAt: input.publishAt !== undefined ? publishAt : undefined,
      publishedAt: input.status !== undefined ? resolved.publishedAt : undefined,
    },
    include: {
      author: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });
}

export async function archiveFaq(id: string) {
  return db.cmsFaq.update({
    where: { id },
    data: { status: 'archived' },
    include: {
      author: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });
}
