import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { slugify, uniqueSlug } from '@/lib/admin/slug';
import { serializeProgram } from './serialize';

const programInclude = {
  _count: { select: { courses: true } },
} as const;

export async function listPrograms(options?: {
  status?: string;
  publishedOnly?: boolean;
  page?: number;
  pageSize?: number;
}) {
  const page = options?.page ?? 1;
  const pageSize = Math.min(options?.pageSize ?? 50, 100);
  const where: Prisma.EducationProgramWhereInput = {};
  if (options?.publishedOnly) {
    where.status = 'published';
    where.isActive = true;
  } else if (options?.status) {
    where.status = options.status as Prisma.EnumEducationPublishStatusFilter;
  }

  const [totalItems, rows] = await Promise.all([
    db.educationProgram.count({ where }),
    db.educationProgram.findMany({
      where,
      include: programInclude,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    items: rows.map(serializeProgram),
    page,
    pageSize,
    totalItems,
  };
}

export async function getProgramBySlug(slug: string, publishedOnly = false) {
  const row = await db.educationProgram.findUnique({
    where: { slug },
    include: {
      ...programInclude,
      courses: publishedOnly
        ? {
            where: { status: 'published' },
            orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
            select: {
              id: true,
              title: true,
              slug: true,
              description: true,
              level: true,
              deliveryType: true,
              durationLabel: true,
              status: true,
            },
          }
        : false,
    },
  });
  if (!row) return null;
  if (publishedOnly && (row.status !== 'published' || !row.isActive)) return null;
  return {
    ...serializeProgram(row),
    courses: 'courses' in row && Array.isArray(row.courses) ? row.courses : undefined,
  };
}

export async function createProgram(input: {
  name: string;
  slug?: string;
  description?: string | null;
  durationLabel?: string | null;
  requirements?: string | null;
  certificateInfo?: string | null;
  sortOrder?: number;
  status?: 'draft' | 'published' | 'archived';
  isActive?: boolean;
}) {
  const slug =
    input.slug ||
    (await uniqueSlug(input.name, async (s) =>
      Boolean(await db.educationProgram.findUnique({ where: { slug: s } }))
    ));

  const row = await db.educationProgram.create({
    data: {
      name: input.name.trim(),
      slug: slugify(slug),
      description: input.description ?? null,
      durationLabel: input.durationLabel ?? null,
      requirements: input.requirements ?? null,
      certificateInfo: input.certificateInfo ?? null,
      sortOrder: input.sortOrder ?? 0,
      status: input.status ?? 'draft',
      isActive: input.isActive ?? true,
    },
    include: programInclude,
  });
  return serializeProgram(row);
}

export async function updateProgram(
  id: string,
  input: {
    name?: string;
    slug?: string;
    description?: string | null;
    durationLabel?: string | null;
    requirements?: string | null;
    certificateInfo?: string | null;
    sortOrder?: number;
    status?: 'draft' | 'published' | 'archived';
    isActive?: boolean;
  }
) {
  const data: Prisma.EducationProgramUpdateInput = {};
  if (input.name !== undefined) data.name = input.name.trim();
  if (input.slug !== undefined) data.slug = slugify(input.slug);
  if (input.description !== undefined) data.description = input.description;
  if (input.durationLabel !== undefined) data.durationLabel = input.durationLabel;
  if (input.requirements !== undefined) data.requirements = input.requirements;
  if (input.certificateInfo !== undefined) data.certificateInfo = input.certificateInfo;
  if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;
  if (input.status !== undefined) data.status = input.status;
  if (input.isActive !== undefined) data.isActive = input.isActive;

  const row = await db.educationProgram.update({
    where: { id },
    data,
    include: programInclude,
  });
  return serializeProgram(row);
}
