-- CreateTable
CREATE TABLE "EducationProgram" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "durationLabel" TEXT,
    "requirements" TEXT,
    "certificateInfo" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "EducationCourse" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "programId" TEXT,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "level" TEXT,
    "deliveryType" TEXT NOT NULL DEFAULT 'hybrid',
    "durationLabel" TEXT,
    "instructorUserId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "requiresMembership" BOOLEAN NOT NULL DEFAULT false,
    "minAge" INTEGER,
    "maxCapacity" INTEGER,
    "enrollmentDeadline" DATETIME,
    "prerequisiteCourseId" TEXT,
    "assignmentWeight" INTEGER NOT NULL DEFAULT 20,
    "quizWeight" INTEGER NOT NULL DEFAULT 20,
    "examWeight" INTEGER NOT NULL DEFAULT 40,
    "attendanceWeight" INTEGER NOT NULL DEFAULT 20,
    "passingScore" INTEGER NOT NULL DEFAULT 60,
    "attendanceThreshold" INTEGER NOT NULL DEFAULT 75,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EducationCourse_programId_fkey" FOREIGN KEY ("programId") REFERENCES "EducationProgram" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "EducationCourse_instructorUserId_fkey" FOREIGN KEY ("instructorUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "EducationCourse_prerequisiteCourseId_fkey" FOREIGN KEY ("prerequisiteCourseId") REFERENCES "EducationCourse" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CourseModule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CourseModule_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "EducationCourse" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CourseLesson" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "moduleId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "content" TEXT,
    "scriptureRefs" TEXT,
    "videoUrl" TEXT,
    "audioUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "authorId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CourseLesson_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "CourseModule" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CourseLesson_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CourseMaterial" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courseId" TEXT,
    "lessonId" TEXT,
    "title" TEXT NOT NULL,
    "materialType" TEXT NOT NULL DEFAULT 'document',
    "fileKey" TEXT,
    "externalUrl" TEXT,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "isPrivate" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CourseMaterial_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "EducationCourse" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CourseMaterial_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "CourseLesson" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LessonProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lessonId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LessonProgress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "CourseLesson" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LessonProgress_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EducationEnrollment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courseId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'application',
    "progressPct" INTEGER NOT NULL DEFAULT 0,
    "appliedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enrolledAt" DATETIME,
    "completedAt" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EducationEnrollment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "EducationCourse" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EducationEnrollment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EducationWaitlist" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courseId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EducationWaitlist_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "EducationCourse" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EducationWaitlist_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EducationClassSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courseId" TEXT NOT NULL,
    "title" TEXT,
    "startsAt" DATETIME NOT NULL,
    "endsAt" DATETIME,
    "location" TEXT,
    "onlineUrl" TEXT,
    "deliveryType" TEXT NOT NULL DEFAULT 'in_person',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EducationClassSession_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "EducationCourse" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EducationAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courseId" TEXT NOT NULL,
    "moduleId" TEXT,
    "lessonId" TEXT,
    "title" TEXT NOT NULL,
    "instructions" TEXT,
    "dueAt" DATETIME,
    "maxScore" INTEGER NOT NULL DEFAULT 100,
    "submissionType" TEXT NOT NULL DEFAULT 'mixed',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EducationAssignment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "EducationCourse" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EducationAssignment_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "CourseModule" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "EducationAssignment_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "CourseLesson" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "EducationAssignment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AssignmentSubmission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assignmentId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "textBody" TEXT,
    "fileKey" TEXT,
    "linkUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "score" INTEGER,
    "feedback" TEXT,
    "privateNote" TEXT,
    "gradedById" TEXT,
    "gradedAt" DATETIME,
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AssignmentSubmission_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "EducationAssignment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AssignmentSubmission_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AssignmentSubmission_gradedById_fkey" FOREIGN KEY ("gradedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EducationQuiz" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courseId" TEXT NOT NULL,
    "moduleId" TEXT,
    "lessonId" TEXT,
    "title" TEXT NOT NULL,
    "instructions" TEXT,
    "timeLimitMin" INTEGER,
    "maxAttempts" INTEGER NOT NULL DEFAULT 1,
    "passingScore" INTEGER NOT NULL DEFAULT 60,
    "shuffleQuestions" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EducationQuiz_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "EducationCourse" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EducationQuiz_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "CourseModule" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "EducationQuiz_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "CourseLesson" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "EducationQuiz_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QuizQuestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quizId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "questionType" TEXT NOT NULL DEFAULT 'multiple_choice',
    "optionsJson" TEXT,
    "correctJson" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "QuizQuestion_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "EducationQuiz" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QuizAttempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quizId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "answersJson" TEXT,
    "score" INTEGER,
    "maxScore" INTEGER,
    "passed" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" DATETIME,
    "lockedAt" DATETIME,
    CONSTRAINT "QuizAttempt_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "EducationQuiz" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "QuizAttempt_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EducationExam" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "instructions" TEXT,
    "startsAt" DATETIME,
    "endsAt" DATETIME,
    "durationMin" INTEGER,
    "maxAttempts" INTEGER NOT NULL DEFAULT 1,
    "passingScore" INTEGER NOT NULL DEFAULT 60,
    "questionsJson" TEXT,
    "answersJson" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EducationExam_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "EducationCourse" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EducationExam_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExamAttempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "examId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "answersJson" TEXT,
    "score" INTEGER,
    "maxScore" INTEGER,
    "passed" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" DATETIME,
    "lockedAt" DATETIME,
    CONSTRAINT "ExamAttempt_examId_fkey" FOREIGN KEY ("examId") REFERENCES "EducationExam" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ExamAttempt_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EducationGrade" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courseId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "assignmentScore" INTEGER,
    "quizScore" INTEGER,
    "examScore" INTEGER,
    "attendanceScore" INTEGER,
    "finalScore" INTEGER,
    "letterGrade" TEXT,
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "feedback" TEXT,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EducationGrade_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "EducationCourse" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EducationGrade_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EducationAttendance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courseId" TEXT NOT NULL,
    "sessionId" TEXT,
    "memberId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'present',
    "attendedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EducationAttendance_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "EducationCourse" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EducationAttendance_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "EducationClassSession" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "EducationAttendance_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EducationCertificate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courseId" TEXT,
    "memberId" TEXT NOT NULL,
    "programName" TEXT,
    "courseTitle" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "certificateNumber" TEXT NOT NULL,
    "verificationCode" TEXT NOT NULL,
    "issuedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "issuedById" TEXT,
    "status" TEXT NOT NULL DEFAULT 'issued',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EducationCertificate_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "EducationCourse" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "EducationCertificate_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EducationCertificate_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EducationAnnouncement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "authorId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EducationAnnouncement_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "EducationCourse" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EducationAnnouncement_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CourseDiscussionPost" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courseId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "parentId" TEXT,
    "body" TEXT NOT NULL,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CourseDiscussionPost_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "EducationCourse" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CourseDiscussionPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CourseDiscussionPost_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "CourseDiscussionPost" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "EducationProgram_slug_key" ON "EducationProgram"("slug");

-- CreateIndex
CREATE INDEX "EducationProgram_status_idx" ON "EducationProgram"("status");

-- CreateIndex
CREATE INDEX "EducationProgram_isActive_idx" ON "EducationProgram"("isActive");

-- CreateIndex
CREATE INDEX "EducationProgram_sortOrder_idx" ON "EducationProgram"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "EducationCourse_slug_key" ON "EducationCourse"("slug");

-- CreateIndex
CREATE INDEX "EducationCourse_programId_idx" ON "EducationCourse"("programId");

-- CreateIndex
CREATE INDEX "EducationCourse_instructorUserId_idx" ON "EducationCourse"("instructorUserId");

-- CreateIndex
CREATE INDEX "EducationCourse_status_idx" ON "EducationCourse"("status");

-- CreateIndex
CREATE INDEX "EducationCourse_category_idx" ON "EducationCourse"("category");

-- CreateIndex
CREATE INDEX "EducationCourse_deliveryType_idx" ON "EducationCourse"("deliveryType");

-- CreateIndex
CREATE INDEX "EducationCourse_enrollmentDeadline_idx" ON "EducationCourse"("enrollmentDeadline");

-- CreateIndex
CREATE INDEX "CourseModule_courseId_idx" ON "CourseModule"("courseId");

-- CreateIndex
CREATE INDEX "CourseModule_courseId_sortOrder_idx" ON "CourseModule"("courseId", "sortOrder");

-- CreateIndex
CREATE INDEX "CourseLesson_moduleId_idx" ON "CourseLesson"("moduleId");

-- CreateIndex
CREATE INDEX "CourseLesson_moduleId_sortOrder_idx" ON "CourseLesson"("moduleId", "sortOrder");

-- CreateIndex
CREATE INDEX "CourseLesson_status_idx" ON "CourseLesson"("status");

-- CreateIndex
CREATE INDEX "CourseMaterial_courseId_idx" ON "CourseMaterial"("courseId");

-- CreateIndex
CREATE INDEX "CourseMaterial_lessonId_idx" ON "CourseMaterial"("lessonId");

-- CreateIndex
CREATE INDEX "LessonProgress_memberId_idx" ON "LessonProgress"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "LessonProgress_lessonId_memberId_key" ON "LessonProgress"("lessonId", "memberId");

-- CreateIndex
CREATE INDEX "EducationEnrollment_memberId_idx" ON "EducationEnrollment"("memberId");

-- CreateIndex
CREATE INDEX "EducationEnrollment_status_idx" ON "EducationEnrollment"("status");

-- CreateIndex
CREATE INDEX "EducationEnrollment_courseId_status_idx" ON "EducationEnrollment"("courseId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "EducationEnrollment_courseId_memberId_key" ON "EducationEnrollment"("courseId", "memberId");

-- CreateIndex
CREATE INDEX "EducationWaitlist_courseId_position_idx" ON "EducationWaitlist"("courseId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "EducationWaitlist_courseId_memberId_key" ON "EducationWaitlist"("courseId", "memberId");

-- CreateIndex
CREATE INDEX "EducationClassSession_courseId_idx" ON "EducationClassSession"("courseId");

-- CreateIndex
CREATE INDEX "EducationClassSession_startsAt_idx" ON "EducationClassSession"("startsAt");

-- CreateIndex
CREATE INDEX "EducationAssignment_courseId_idx" ON "EducationAssignment"("courseId");

-- CreateIndex
CREATE INDEX "EducationAssignment_dueAt_idx" ON "EducationAssignment"("dueAt");

-- CreateIndex
CREATE INDEX "EducationAssignment_status_idx" ON "EducationAssignment"("status");

-- CreateIndex
CREATE INDEX "AssignmentSubmission_memberId_idx" ON "AssignmentSubmission"("memberId");

-- CreateIndex
CREATE INDEX "AssignmentSubmission_status_idx" ON "AssignmentSubmission"("status");

-- CreateIndex
CREATE UNIQUE INDEX "AssignmentSubmission_assignmentId_memberId_key" ON "AssignmentSubmission"("assignmentId", "memberId");

-- CreateIndex
CREATE INDEX "EducationQuiz_courseId_idx" ON "EducationQuiz"("courseId");

-- CreateIndex
CREATE INDEX "EducationQuiz_status_idx" ON "EducationQuiz"("status");

-- CreateIndex
CREATE INDEX "QuizQuestion_quizId_idx" ON "QuizQuestion"("quizId");

-- CreateIndex
CREATE INDEX "QuizQuestion_quizId_sortOrder_idx" ON "QuizQuestion"("quizId", "sortOrder");

-- CreateIndex
CREATE INDEX "QuizAttempt_quizId_idx" ON "QuizAttempt"("quizId");

-- CreateIndex
CREATE INDEX "QuizAttempt_memberId_idx" ON "QuizAttempt"("memberId");

-- CreateIndex
CREATE INDEX "QuizAttempt_quizId_memberId_idx" ON "QuizAttempt"("quizId", "memberId");

-- CreateIndex
CREATE INDEX "EducationExam_courseId_idx" ON "EducationExam"("courseId");

-- CreateIndex
CREATE INDEX "EducationExam_startsAt_idx" ON "EducationExam"("startsAt");

-- CreateIndex
CREATE INDEX "EducationExam_status_idx" ON "EducationExam"("status");

-- CreateIndex
CREATE INDEX "ExamAttempt_examId_idx" ON "ExamAttempt"("examId");

-- CreateIndex
CREATE INDEX "ExamAttempt_memberId_idx" ON "ExamAttempt"("memberId");

-- CreateIndex
CREATE INDEX "ExamAttempt_examId_memberId_idx" ON "ExamAttempt"("examId", "memberId");

-- CreateIndex
CREATE INDEX "EducationGrade_memberId_idx" ON "EducationGrade"("memberId");

-- CreateIndex
CREATE INDEX "EducationGrade_status_idx" ON "EducationGrade"("status");

-- CreateIndex
CREATE UNIQUE INDEX "EducationGrade_courseId_memberId_key" ON "EducationGrade"("courseId", "memberId");

-- CreateIndex
CREATE INDEX "EducationAttendance_memberId_idx" ON "EducationAttendance"("memberId");

-- CreateIndex
CREATE INDEX "EducationAttendance_courseId_idx" ON "EducationAttendance"("courseId");

-- CreateIndex
CREATE INDEX "EducationAttendance_attendedAt_idx" ON "EducationAttendance"("attendedAt");

-- CreateIndex
CREATE UNIQUE INDEX "EducationAttendance_courseId_memberId_sessionId_key" ON "EducationAttendance"("courseId", "memberId", "sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "EducationCertificate_certificateNumber_key" ON "EducationCertificate"("certificateNumber");

-- CreateIndex
CREATE UNIQUE INDEX "EducationCertificate_verificationCode_key" ON "EducationCertificate"("verificationCode");

-- CreateIndex
CREATE INDEX "EducationCertificate_memberId_idx" ON "EducationCertificate"("memberId");

-- CreateIndex
CREATE INDEX "EducationCertificate_courseId_idx" ON "EducationCertificate"("courseId");

-- CreateIndex
CREATE INDEX "EducationCertificate_verificationCode_idx" ON "EducationCertificate"("verificationCode");

-- CreateIndex
CREATE INDEX "EducationAnnouncement_courseId_idx" ON "EducationAnnouncement"("courseId");

-- CreateIndex
CREATE INDEX "EducationAnnouncement_createdAt_idx" ON "EducationAnnouncement"("createdAt");

-- CreateIndex
CREATE INDEX "CourseDiscussionPost_courseId_idx" ON "CourseDiscussionPost"("courseId");

-- CreateIndex
CREATE INDEX "CourseDiscussionPost_authorId_idx" ON "CourseDiscussionPost"("authorId");

-- CreateIndex
CREATE INDEX "CourseDiscussionPost_parentId_idx" ON "CourseDiscussionPost"("parentId");

