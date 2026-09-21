function iso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

export function serializeProgram(row: {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  durationLabel: string | null;
  requirements: string | null;
  certificateInfo: string | null;
  sortOrder: number;
  status: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count?: { courses?: number };
}) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    durationLabel: row.durationLabel,
    requirements: row.requirements,
    certificateInfo: row.certificateInfo,
    sortOrder: row.sortOrder,
    status: row.status,
    isActive: row.isActive,
    courseCount: row._count?.courses ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function serializeCourse(
  row: {
    id: string;
    programId: string | null;
    title: string;
    slug: string;
    description: string | null;
    category: string | null;
    level: string | null;
    deliveryType: string;
    durationLabel: string | null;
    instructorUserId: string | null;
    status: string;
    requiresMembership: boolean;
    minAge: number | null;
    maxCapacity: number | null;
    enrollmentDeadline: Date | null;
    prerequisiteCourseId: string | null;
    assignmentWeight: number;
    quizWeight: number;
    examWeight: number;
    attendanceWeight: number;
    passingScore: number;
    attendanceThreshold: number;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
    program?: { id: string; name: string; slug: string } | null;
    instructorUser?: { id: string; firstName: string; lastName: string } | null;
    _count?: { enrollments?: number; modules?: number };
  },
  options?: { includeWeights?: boolean }
) {
  const instructor = row.instructorUser
    ? {
        id: row.instructorUser.id,
        name: `${row.instructorUser.firstName} ${row.instructorUser.lastName}`.trim(),
      }
    : null;

  return {
    id: row.id,
    programId: row.programId,
    program: row.program
      ? { id: row.program.id, name: row.program.name, slug: row.program.slug }
      : null,
    title: row.title,
    slug: row.slug,
    description: row.description,
    category: row.category,
    level: row.level,
    deliveryType: row.deliveryType,
    durationLabel: row.durationLabel,
    instructorUserId: row.instructorUserId,
    instructor,
    status: row.status,
    requiresMembership: row.requiresMembership,
    minAge: row.minAge,
    maxCapacity: row.maxCapacity,
    enrollmentDeadline: iso(row.enrollmentDeadline),
    prerequisiteCourseId: row.prerequisiteCourseId,
    ...(options?.includeWeights
      ? {
          assignmentWeight: row.assignmentWeight,
          quizWeight: row.quizWeight,
          examWeight: row.examWeight,
          attendanceWeight: row.attendanceWeight,
          passingScore: row.passingScore,
          attendanceThreshold: row.attendanceThreshold,
        }
      : {}),
    sortOrder: row.sortOrder,
    enrollmentCount: row._count?.enrollments,
    moduleCount: row._count?.modules,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function serializeModule(row: {
  id: string;
  courseId: string;
  title: string;
  description: string | null;
  sortOrder: number;
  lessons?: Array<{
    id: string;
    title: string;
    description: string | null;
    sortOrder: number;
    status: string;
    scriptureRefs: string | null;
    videoUrl: string | null;
    audioUrl: string | null;
  }>;
}) {
  return {
    id: row.id,
    courseId: row.courseId,
    title: row.title,
    description: row.description,
    sortOrder: row.sortOrder,
    lessons: (row.lessons || []).map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      description: lesson.description,
      sortOrder: lesson.sortOrder,
      status: lesson.status,
      scriptureRefs: lesson.scriptureRefs,
      videoUrl: lesson.videoUrl,
      audioUrl: lesson.audioUrl,
    })),
  };
}

export function serializeEnrollment(row: {
  id: string;
  courseId: string;
  memberId: string;
  status: string;
  progressPct: number;
  appliedAt: Date;
  enrolledAt: Date | null;
  completedAt: Date | null;
  notes: string | null;
  course?: { id: string; title: string; slug: string; status: string } | null;
  member?: { id: string; displayName: string | null; membershipNumber: string | null } | null;
}) {
  return {
    id: row.id,
    courseId: row.courseId,
    memberId: row.memberId,
    status: row.status,
    progressPct: row.progressPct,
    appliedAt: row.appliedAt.toISOString(),
    enrolledAt: iso(row.enrolledAt),
    completedAt: iso(row.completedAt),
    notes: row.notes,
    course: row.course
      ? {
          id: row.course.id,
          title: row.course.title,
          slug: row.course.slug,
          status: row.course.status,
        }
      : null,
    member: row.member
      ? {
          id: row.member.id,
          displayName: row.member.displayName,
          membershipNumber: row.member.membershipNumber,
        }
      : null,
  };
}

/** Quiz for learners — never includes correctJson. */
export function serializeQuizForLearner(row: {
  id: string;
  courseId: string;
  title: string;
  instructions: string | null;
  timeLimitMin: number | null;
  maxAttempts: number;
  passingScore: number;
  status: string;
  questions?: Array<{
    id: string;
    prompt: string;
    questionType: string;
    optionsJson: string | null;
    points: number;
    sortOrder: number;
  }>;
}) {
  return {
    id: row.id,
    courseId: row.courseId,
    title: row.title,
    instructions: row.instructions,
    timeLimitMin: row.timeLimitMin,
    maxAttempts: row.maxAttempts,
    passingScore: row.passingScore,
    status: row.status,
    questions: (row.questions || []).map((q) => ({
      id: q.id,
      prompt: q.prompt,
      questionType: q.questionType,
      options: q.optionsJson ? (JSON.parse(q.optionsJson) as unknown) : null,
      points: q.points,
      sortOrder: q.sortOrder,
    })),
  };
}

export function serializeCertificate(row: {
  id: string;
  courseId: string | null;
  memberId: string;
  programName: string | null;
  courseTitle: string;
  studentName: string;
  certificateNumber: string;
  verificationCode: string;
  issuedAt: Date;
  status: string;
}) {
  return {
    id: row.id,
    courseId: row.courseId,
    memberId: row.memberId,
    programName: row.programName,
    courseTitle: row.courseTitle,
    studentName: row.studentName,
    certificateNumber: row.certificateNumber,
    verificationCode: row.verificationCode,
    issuedAt: row.issuedAt.toISOString(),
    status: row.status,
  };
}

export function serializeCertificatePublic(row: {
  programName: string | null;
  courseTitle: string;
  studentName: string;
  certificateNumber: string;
  verificationCode: string;
  issuedAt: Date;
  status: string;
}) {
  return {
    valid: row.status === 'issued',
    programName: row.programName,
    courseTitle: row.courseTitle,
    studentName: row.studentName,
    certificateNumber: row.certificateNumber,
    verificationCode: row.verificationCode,
    issuedAt: row.issuedAt.toISOString(),
    status: row.status,
  };
}
