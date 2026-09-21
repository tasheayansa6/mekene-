import { db } from '@/lib/db';
import { isActiveEnrollmentStatus } from './access';
import { serializeEnrollment } from './serialize';

export async function getMemberByUserId(userId: string) {
  return db.member.findUnique({
    where: { userId },
    select: {
      id: true,
      displayName: true,
      membershipNumber: true,
      status: true,
      userId: true,
    },
  });
}

export async function applyToCourse(input: {
  courseId: string;
  memberId: string;
  notes?: string | null;
}) {
  const course = await db.educationCourse.findUnique({
    where: { id: input.courseId },
    select: {
      id: true,
      status: true,
      maxCapacity: true,
      enrollmentDeadline: true,
      requiresMembership: true,
      prerequisiteCourseId: true,
    },
  });
  if (!course || course.status !== 'published') {
    return { ok: false as const, error: 'Course is not open for enrollment' };
  }
  if (course.enrollmentDeadline && course.enrollmentDeadline < new Date()) {
    return { ok: false as const, error: 'Enrollment deadline has passed' };
  }

  if (course.prerequisiteCourseId) {
    const prereq = await db.educationEnrollment.findUnique({
      where: {
        courseId_memberId: {
          courseId: course.prerequisiteCourseId,
          memberId: input.memberId,
        },
      },
    });
    if (!prereq || prereq.status !== 'completed') {
      return { ok: false as const, error: 'Prerequisite course not completed' };
    }
  }

  const existing = await db.educationEnrollment.findUnique({
    where: {
      courseId_memberId: { courseId: input.courseId, memberId: input.memberId },
    },
  });
  if (existing) {
    return { ok: true as const, enrollment: serializeEnrollment(existing), created: false };
  }

  const activeCount = await db.educationEnrollment.count({
    where: {
      courseId: input.courseId,
      status: { in: ['approved', 'enrolled', 'active'] },
    },
  });

  if (course.maxCapacity != null && activeCount >= course.maxCapacity) {
    const waitCount = await db.educationWaitlist.count({ where: { courseId: input.courseId } });
    await db.educationWaitlist.create({
      data: {
        courseId: input.courseId,
        memberId: input.memberId,
        position: waitCount + 1,
      },
    });
    return { ok: false as const, error: 'Course is full; you were added to the waitlist' };
  }

  const row = await db.educationEnrollment.create({
    data: {
      courseId: input.courseId,
      memberId: input.memberId,
      status: 'application',
      notes: input.notes ?? null,
    },
    include: {
      course: { select: { id: true, title: true, slug: true, status: true } },
    },
  });

  return { ok: true as const, enrollment: serializeEnrollment(row), created: true };
}

export async function setEnrollmentStatus(input: {
  enrollmentId: string;
  status: string;
  notes?: string | null;
}) {
  const allowed = [
    'application',
    'pending',
    'approved',
    'enrolled',
    'active',
    'completed',
    'withdrawn',
    'rejected',
  ];
  if (!allowed.includes(input.status)) {
    return { ok: false as const, error: 'Invalid enrollment status' };
  }

  const data: {
    status: 'application' | 'pending' | 'approved' | 'enrolled' | 'active' | 'completed' | 'withdrawn' | 'rejected';
    notes?: string | null;
    enrolledAt?: Date | null;
    completedAt?: Date | null;
  } = {
    status: input.status as typeof data.status,
  };
  if (input.notes !== undefined) data.notes = input.notes;
  if (isActiveEnrollmentStatus(input.status) && input.status !== 'completed') {
    data.enrolledAt = new Date();
  }
  if (input.status === 'completed') {
    data.completedAt = new Date();
    data.enrolledAt = new Date();
  }

  const row = await db.educationEnrollment.update({
    where: { id: input.enrollmentId },
    data,
    include: {
      course: { select: { id: true, title: true, slug: true, status: true } },
      member: { select: { id: true, displayName: true, membershipNumber: true } },
    },
  });

  return { ok: true as const, enrollment: serializeEnrollment(row) };
}

export async function requireActiveEnrollment(courseId: string, memberId: string) {
  const enrollment = await db.educationEnrollment.findUnique({
    where: { courseId_memberId: { courseId, memberId } },
  });
  if (!enrollment || !isActiveEnrollmentStatus(enrollment.status)) {
    return null;
  }
  return enrollment;
}
