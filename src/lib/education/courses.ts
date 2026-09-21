import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { slugify, uniqueSlug } from '@/lib/admin/slug';
import { serializeCourse, serializeModule } from './serialize';

const courseInclude = {
  program: { select: { id: true, name: true, slug: true } },
  instructorUser: { select: { id: true, firstName: true, lastName: true } },
  _count: { select: { enrollments: true, modules: true } },
} as const;

export async function listCourses(options?: {
  status?: string;
  programId?: string;
  publishedOnly?: boolean;
  instructorUserId?: string;
  page?: number;
  pageSize?: number;
  includeWeights?: boolean;
}) {
  const page = options?.page ?? 1;
  const pageSize = Math.min(options?.pageSize ?? 50, 100);
  const where: Prisma.EducationCourseWhereInput = {};
  if (options?.publishedOnly) {
    where.status = 'published';
  } else if (options?.status) {
    where.status = options.status as Prisma.EnumEducationPublishStatusFilter;
  }
  if (options?.programId) where.programId = options.programId;
  if (options?.instructorUserId) where.instructorUserId = options.instructorUserId;

  const [totalItems, rows] = await Promise.all([
    db.educationCourse.count({ where }),
    db.educationCourse.findMany({
      where,
      include: courseInclude,
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    items: rows.map((row) =>
      serializeCourse(row, { includeWeights: options?.includeWeights })
    ),
    page,
    pageSize,
    totalItems,
  };
}

export async function getCourseById(
  id: string,
  options?: { includeModules?: boolean; publishedLessonsOnly?: boolean; includeWeights?: boolean }
) {
  const row = await db.educationCourse.findUnique({
    where: { id },
    include: {
      ...courseInclude,
      modules: options?.includeModules
        ? {
            orderBy: { sortOrder: 'asc' },
            include: {
              lessons: {
                where: options.publishedLessonsOnly ? { status: 'published' } : undefined,
                orderBy: { sortOrder: 'asc' },
                select: {
                  id: true,
                  title: true,
                  description: true,
                  sortOrder: true,
                  status: true,
                  scriptureRefs: true,
                  videoUrl: true,
                  audioUrl: true,
                },
              },
            },
          }
        : false,
    },
  });
  if (!row) return null;
  return {
    ...serializeCourse(row, { includeWeights: options?.includeWeights }),
    modules:
      'modules' in row && Array.isArray(row.modules)
        ? row.modules.map(serializeModule)
        : undefined,
  };
}

export async function getCourseBySlug(
  slug: string,
  options?: { publishedOnly?: boolean; includeModules?: boolean; publishedLessonsOnly?: boolean }
) {
  const row = await db.educationCourse.findUnique({
    where: { slug },
    include: {
      ...courseInclude,
      modules: options?.includeModules
        ? {
            orderBy: { sortOrder: 'asc' },
            include: {
              lessons: {
                where: options.publishedLessonsOnly ? { status: 'published' } : undefined,
                orderBy: { sortOrder: 'asc' },
                select: {
                  id: true,
                  title: true,
                  description: true,
                  sortOrder: true,
                  status: true,
                  scriptureRefs: true,
                  videoUrl: true,
                  audioUrl: true,
                },
              },
            },
          }
        : false,
    },
  });
  if (!row) return null;
  if (options?.publishedOnly && row.status !== 'published') return null;
  return {
    ...serializeCourse(row),
    modules:
      'modules' in row && Array.isArray(row.modules)
        ? row.modules.map(serializeModule)
        : undefined,
  };
}

export async function createCourse(input: {
  title: string;
  slug?: string;
  programId?: string | null;
  description?: string | null;
  category?: string | null;
  level?: string | null;
  deliveryType?: 'online' | 'in_person' | 'hybrid';
  durationLabel?: string | null;
  instructorUserId?: string | null;
  status?: 'draft' | 'published' | 'archived';
  requiresMembership?: boolean;
  minAge?: number | null;
  maxCapacity?: number | null;
  enrollmentDeadline?: string | null;
  prerequisiteCourseId?: string | null;
  assignmentWeight?: number;
  quizWeight?: number;
  examWeight?: number;
  attendanceWeight?: number;
  passingScore?: number;
  attendanceThreshold?: number;
  sortOrder?: number;
}) {
  const slug =
    input.slug ||
    (await uniqueSlug(input.title, async (s) =>
      Boolean(await db.educationCourse.findUnique({ where: { slug: s } }))
    ));

  const row = await db.educationCourse.create({
    data: {
      title: input.title.trim(),
      slug: slugify(slug),
      programId: input.programId ?? null,
      description: input.description ?? null,
      category: input.category ?? null,
      level: input.level ?? null,
      deliveryType: input.deliveryType ?? 'hybrid',
      durationLabel: input.durationLabel ?? null,
      instructorUserId: input.instructorUserId ?? null,
      status: input.status ?? 'draft',
      requiresMembership: input.requiresMembership ?? false,
      minAge: input.minAge ?? null,
      maxCapacity: input.maxCapacity ?? null,
      enrollmentDeadline: input.enrollmentDeadline
        ? new Date(input.enrollmentDeadline)
        : null,
      prerequisiteCourseId: input.prerequisiteCourseId ?? null,
      assignmentWeight: input.assignmentWeight ?? 20,
      quizWeight: input.quizWeight ?? 20,
      examWeight: input.examWeight ?? 40,
      attendanceWeight: input.attendanceWeight ?? 20,
      passingScore: input.passingScore ?? 60,
      attendanceThreshold: input.attendanceThreshold ?? 75,
      sortOrder: input.sortOrder ?? 0,
    },
    include: courseInclude,
  });
  return serializeCourse(row, { includeWeights: true });
}

export async function updateCourse(
  id: string,
  input: Partial<{
    title: string;
    slug: string;
    programId: string | null;
    description: string | null;
    category: string | null;
    level: string | null;
    deliveryType: 'online' | 'in_person' | 'hybrid';
    durationLabel: string | null;
    instructorUserId: string | null;
    status: 'draft' | 'published' | 'archived';
    requiresMembership: boolean;
    minAge: number | null;
    maxCapacity: number | null;
    enrollmentDeadline: string | null;
    prerequisiteCourseId: string | null;
    assignmentWeight: number;
    quizWeight: number;
    examWeight: number;
    attendanceWeight: number;
    passingScore: number;
    attendanceThreshold: number;
    sortOrder: number;
  }>
) {
  const data: Prisma.EducationCourseUpdateInput = {};
  if (input.title !== undefined) data.title = input.title.trim();
  if (input.slug !== undefined) data.slug = slugify(input.slug);
  if (input.programId !== undefined) {
    data.program = input.programId
      ? { connect: { id: input.programId } }
      : { disconnect: true };
  }
  if (input.description !== undefined) data.description = input.description;
  if (input.category !== undefined) data.category = input.category;
  if (input.level !== undefined) data.level = input.level;
  if (input.deliveryType !== undefined) data.deliveryType = input.deliveryType;
  if (input.durationLabel !== undefined) data.durationLabel = input.durationLabel;
  if (input.instructorUserId !== undefined) {
    data.instructorUser = input.instructorUserId
      ? { connect: { id: input.instructorUserId } }
      : { disconnect: true };
  }
  if (input.status !== undefined) data.status = input.status;
  if (input.requiresMembership !== undefined) data.requiresMembership = input.requiresMembership;
  if (input.minAge !== undefined) data.minAge = input.minAge;
  if (input.maxCapacity !== undefined) data.maxCapacity = input.maxCapacity;
  if (input.enrollmentDeadline !== undefined) {
    data.enrollmentDeadline = input.enrollmentDeadline
      ? new Date(input.enrollmentDeadline)
      : null;
  }
  if (input.prerequisiteCourseId !== undefined) {
    data.prerequisiteCourse = input.prerequisiteCourseId
      ? { connect: { id: input.prerequisiteCourseId } }
      : { disconnect: true };
  }
  if (input.assignmentWeight !== undefined) data.assignmentWeight = input.assignmentWeight;
  if (input.quizWeight !== undefined) data.quizWeight = input.quizWeight;
  if (input.examWeight !== undefined) data.examWeight = input.examWeight;
  if (input.attendanceWeight !== undefined) data.attendanceWeight = input.attendanceWeight;
  if (input.passingScore !== undefined) data.passingScore = input.passingScore;
  if (input.attendanceThreshold !== undefined) {
    data.attendanceThreshold = input.attendanceThreshold;
  }
  if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;

  const row = await db.educationCourse.update({
    where: { id },
    data,
    include: courseInclude,
  });
  return serializeCourse(row, { includeWeights: true });
}

export async function listCourseModules(courseId: string, publishedLessonsOnly = false) {
  const modules = await db.courseModule.findMany({
    where: { courseId },
    orderBy: { sortOrder: 'asc' },
    include: {
      lessons: {
        where: publishedLessonsOnly ? { status: 'published' } : undefined,
        orderBy: { sortOrder: 'asc' },
        select: {
          id: true,
          title: true,
          description: true,
          sortOrder: true,
          status: true,
          scriptureRefs: true,
          videoUrl: true,
          audioUrl: true,
        },
      },
    },
  });
  return modules.map(serializeModule);
}
