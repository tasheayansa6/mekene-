-- Phase 21: Staff, Volunteers & Ministry Management

CREATE TABLE "StaffDepartment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "StaffDepartment_slug_key" ON "StaffDepartment"("slug");
CREATE INDEX "StaffDepartment_isActive_idx" ON "StaffDepartment"("isActive");
CREATE INDEX "StaffDepartment_sortOrder_idx" ON "StaffDepartment"("sortOrder");

CREATE TABLE "StaffPosition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "StaffPosition_slug_key" ON "StaffPosition"("slug");
CREATE INDEX "StaffPosition_isActive_idx" ON "StaffPosition"("isActive");
CREATE INDEX "StaffPosition_sortOrder_idx" ON "StaffPosition"("sortOrder");

CREATE TABLE "StaffProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "staffNumber" TEXT,
    "userId" TEXT NOT NULL,
    "memberId" TEXT,
    "departmentId" TEXT,
    "positionId" TEXT,
    "supervisorId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "startDate" DATETIME,
    "workEmail" TEXT,
    "workPhone" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StaffProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StaffProfile_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "StaffProfile_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "StaffDepartment" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "StaffProfile_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "StaffPosition" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "StaffProfile_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "StaffProfile_staffNumber_key" ON "StaffProfile"("staffNumber");
CREATE UNIQUE INDEX "StaffProfile_memberId_key" ON "StaffProfile"("memberId");
CREATE INDEX "StaffProfile_userId_idx" ON "StaffProfile"("userId");
CREATE INDEX "StaffProfile_status_idx" ON "StaffProfile"("status");
CREATE INDEX "StaffProfile_departmentId_idx" ON "StaffProfile"("departmentId");
CREATE INDEX "StaffProfile_positionId_idx" ON "StaffProfile"("positionId");
CREATE INDEX "StaffProfile_supervisorId_idx" ON "StaffProfile"("supervisorId");

CREATE TABLE "StaffStatusHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "staffId" TEXT NOT NULL,
    "oldStatus" TEXT,
    "newStatus" TEXT NOT NULL,
    "reason" TEXT,
    "changedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StaffStatusHistory_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "StaffProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StaffStatusHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "StaffStatusHistory_staffId_idx" ON "StaffStatusHistory"("staffId");
CREATE INDEX "StaffStatusHistory_createdAt_idx" ON "StaffStatusHistory"("createdAt");

CREATE TABLE "VolunteerSkillCatalog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "VolunteerSkillCatalog_slug_key" ON "VolunteerSkillCatalog"("slug");
CREATE INDEX "VolunteerSkillCatalog_isActive_idx" ON "VolunteerSkillCatalog"("isActive");

CREATE TABLE "VolunteerProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'applicant',
    "joinedAt" DATETIME,
    "experience" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VolunteerProfile_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "VolunteerProfile_memberId_key" ON "VolunteerProfile"("memberId");
CREATE INDEX "VolunteerProfile_status_idx" ON "VolunteerProfile"("status");

CREATE TABLE "VolunteerApplication" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "ministryId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "preferredMinistry" TEXT,
    "skills" TEXT,
    "experience" TEXT,
    "availability" TEXT,
    "motivation" TEXT,
    "preferredTimes" TEXT,
    "reviewerMessage" TEXT,
    "reviewNotes" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" DATETIME,
    "submittedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VolunteerApplication_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VolunteerApplication_ministryId_fkey" FOREIGN KEY ("ministryId") REFERENCES "Ministry" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "VolunteerApplication_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "VolunteerApplication_memberId_idx" ON "VolunteerApplication"("memberId");
CREATE INDEX "VolunteerApplication_ministryId_idx" ON "VolunteerApplication"("ministryId");
CREATE INDEX "VolunteerApplication_status_idx" ON "VolunteerApplication"("status");
CREATE INDEX "VolunteerApplication_submittedAt_idx" ON "VolunteerApplication"("submittedAt");

CREATE TABLE "VolunteerSkill" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "proficiency" TEXT NOT NULL DEFAULT 'beginner',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VolunteerSkill_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VolunteerSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "VolunteerSkillCatalog" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "VolunteerSkill_memberId_skillId_key" ON "VolunteerSkill"("memberId", "skillId");
CREATE INDEX "VolunteerSkill_skillId_idx" ON "VolunteerSkill"("skillId");

CREATE TABLE "VolunteerQualification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "issuer" TEXT,
    "earnedAt" DATETIME,
    "fileUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VolunteerQualification_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "VolunteerQualification_memberId_idx" ON "VolunteerQualification"("memberId");

CREATE TABLE "MinistryTeam" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ministryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "leaderUserId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MinistryTeam_ministryId_fkey" FOREIGN KEY ("ministryId") REFERENCES "Ministry" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MinistryTeam_leaderUserId_fkey" FOREIGN KEY ("leaderUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "MinistryTeam_ministryId_slug_key" ON "MinistryTeam"("ministryId", "slug");
CREATE INDEX "MinistryTeam_ministryId_idx" ON "MinistryTeam"("ministryId");
CREATE INDEX "MinistryTeam_leaderUserId_idx" ON "MinistryTeam"("leaderUserId");
CREATE INDEX "MinistryTeam_isActive_idx" ON "MinistryTeam"("isActive");

CREATE TABLE "MinistryTeamMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "roleLabel" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "startDate" DATETIME,
    "endDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MinistryTeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "MinistryTeam" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MinistryTeamMember_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "MinistryTeamMember_teamId_memberId_key" ON "MinistryTeamMember"("teamId", "memberId");
CREATE INDEX "MinistryTeamMember_memberId_idx" ON "MinistryTeamMember"("memberId");
CREATE INDEX "MinistryTeamMember_status_idx" ON "MinistryTeamMember"("status");

CREATE TABLE "MinistryRoleAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ministryId" TEXT NOT NULL,
    "teamId" TEXT,
    "memberId" TEXT NOT NULL,
    "roleName" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'active',
    "assignedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MinistryRoleAssignment_ministryId_fkey" FOREIGN KEY ("ministryId") REFERENCES "Ministry" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MinistryRoleAssignment_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "MinistryTeam" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MinistryRoleAssignment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MinistryRoleAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "MinistryRoleAssignment_ministryId_idx" ON "MinistryRoleAssignment"("ministryId");
CREATE INDEX "MinistryRoleAssignment_teamId_idx" ON "MinistryRoleAssignment"("teamId");
CREATE INDEX "MinistryRoleAssignment_memberId_idx" ON "MinistryRoleAssignment"("memberId");
CREATE INDEX "MinistryRoleAssignment_status_idx" ON "MinistryRoleAssignment"("status");
CREATE INDEX "MinistryRoleAssignment_startDate_idx" ON "MinistryRoleAssignment"("startDate");

CREATE TABLE "VolunteerAvailability" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VolunteerAvailability_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "VolunteerAvailability_memberId_idx" ON "VolunteerAvailability"("memberId");
CREATE INDEX "VolunteerAvailability_dayOfWeek_idx" ON "VolunteerAvailability"("dayOfWeek");

CREATE TABLE "AvailabilityException" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "startAt" DATETIME NOT NULL,
    "endAt" DATETIME NOT NULL,
    "reason" TEXT,
    "isAvailable" BOOLEAN NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AvailabilityException_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "AvailabilityException_memberId_idx" ON "AvailabilityException"("memberId");
CREATE INDEX "AvailabilityException_startAt_idx" ON "AvailabilityException"("startAt");
CREATE INDEX "AvailabilityException_endAt_idx" ON "AvailabilityException"("endAt");

CREATE TABLE "ServiceAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "ministryId" TEXT,
    "teamId" TEXT,
    "roleName" TEXT NOT NULL,
    "scheduledAt" DATETIME NOT NULL,
    "endsAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'proposed',
    "declineReason" TEXT,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ServiceAssignment_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ServiceAssignment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ServiceAssignment_ministryId_fkey" FOREIGN KEY ("ministryId") REFERENCES "Ministry" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ServiceAssignment_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "MinistryTeam" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ServiceAssignment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "ServiceAssignment_eventId_idx" ON "ServiceAssignment"("eventId");
CREATE INDEX "ServiceAssignment_memberId_idx" ON "ServiceAssignment"("memberId");
CREATE INDEX "ServiceAssignment_ministryId_idx" ON "ServiceAssignment"("ministryId");
CREATE INDEX "ServiceAssignment_teamId_idx" ON "ServiceAssignment"("teamId");
CREATE INDEX "ServiceAssignment_scheduledAt_idx" ON "ServiceAssignment"("scheduledAt");
CREATE INDEX "ServiceAssignment_status_idx" ON "ServiceAssignment"("status");

CREATE TABLE "TrainingProgram" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ministryId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TrainingProgram_ministryId_fkey" FOREIGN KEY ("ministryId") REFERENCES "Ministry" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "TrainingProgram_slug_key" ON "TrainingProgram"("slug");
CREATE INDEX "TrainingProgram_ministryId_idx" ON "TrainingProgram"("ministryId");
CREATE INDEX "TrainingProgram_isActive_idx" ON "TrainingProgram"("isActive");

CREATE TABLE "TrainingSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "programId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startsAt" DATETIME NOT NULL,
    "endsAt" DATETIME,
    "location" TEXT,
    "capacity" INTEGER,
    "instructorId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TrainingSession_programId_fkey" FOREIGN KEY ("programId") REFERENCES "TrainingProgram" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TrainingSession_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "TrainingSession_programId_idx" ON "TrainingSession"("programId");
CREATE INDEX "TrainingSession_startsAt_idx" ON "TrainingSession"("startsAt");
CREATE INDEX "TrainingSession_status_idx" ON "TrainingSession"("status");

CREATE TABLE "TrainingEnrollment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'enrolled',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TrainingEnrollment_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TrainingSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TrainingEnrollment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "TrainingEnrollment_sessionId_memberId_key" ON "TrainingEnrollment"("sessionId", "memberId");
CREATE INDEX "TrainingEnrollment_memberId_idx" ON "TrainingEnrollment"("memberId");
CREATE INDEX "TrainingEnrollment_status_idx" ON "TrainingEnrollment"("status");

CREATE TABLE "TrainingWaitlist" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TrainingWaitlist_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TrainingSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "TrainingWaitlist_sessionId_memberId_key" ON "TrainingWaitlist"("sessionId", "memberId");
CREATE INDEX "TrainingWaitlist_sessionId_idx" ON "TrainingWaitlist"("sessionId");
CREATE INDEX "TrainingWaitlist_position_idx" ON "TrainingWaitlist"("position");

CREATE TABLE "VolunteerTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "ministryId" TEXT,
    "teamId" TEXT,
    "eventId" TEXT,
    "assigneeId" TEXT,
    "memberId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'todo',
    "dueAt" DATETIME,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VolunteerTask_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "MinistryTeam" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "VolunteerTask_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "VolunteerTask_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "VolunteerTask_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "VolunteerTask_teamId_idx" ON "VolunteerTask"("teamId");
CREATE INDEX "VolunteerTask_memberId_idx" ON "VolunteerTask"("memberId");
CREATE INDEX "VolunteerTask_assigneeId_idx" ON "VolunteerTask"("assigneeId");
CREATE INDEX "VolunteerTask_status_idx" ON "VolunteerTask"("status");
CREATE INDEX "VolunteerTask_dueAt_idx" ON "VolunteerTask"("dueAt");
