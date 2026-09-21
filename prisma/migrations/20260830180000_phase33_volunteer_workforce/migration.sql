-- Phase 33: Volunteer & Workforce Management (extends Phase 21)

ALTER TABLE "VolunteerProfile" ADD COLUMN "maxFrequencyPerMonth" INTEGER;
ALTER TABLE "VolunteerProfile" ADD COLUMN "preferredServiceTypes" TEXT;

ALTER TABLE "VolunteerQualification" ADD COLUMN "expiresAt" DATETIME;
ALTER TABLE "VolunteerQualification" ADD COLUMN "programId" TEXT;

ALTER TABLE "MinistryTeam" ADD COLUMN "departmentId" TEXT;
ALTER TABLE "MinistryTeam" ADD COLUMN "assistantLeaderUserId" TEXT;

ALTER TABLE "TrainingProgram" ADD COLUMN "expiresAfterDays" INTEGER;

ALTER TABLE "ServiceAssignment" ADD COLUMN "roleId" TEXT;
ALTER TABLE "ServiceAssignment" ADD COLUMN "attendanceStatus" TEXT;
ALTER TABLE "ServiceAssignment" ADD COLUMN "checkInAt" DATETIME;
ALTER TABLE "ServiceAssignment" ADD COLUMN "checkOutAt" DATETIME;
ALTER TABLE "ServiceAssignment" ADD COLUMN "hoursMinutes" INTEGER;
ALTER TABLE "ServiceAssignment" ADD COLUMN "checkInTokenHash" TEXT;

CREATE UNIQUE INDEX "ServiceAssignment_checkInTokenHash_key" ON "ServiceAssignment"("checkInTokenHash");
CREATE INDEX "ServiceAssignment_roleId_idx" ON "ServiceAssignment"("roleId");
CREATE INDEX "ServiceAssignment_attendanceStatus_idx" ON "ServiceAssignment"("attendanceStatus");
CREATE INDEX "VolunteerQualification_expiresAt_idx" ON "VolunteerQualification"("expiresAt");
CREATE INDEX "VolunteerQualification_programId_idx" ON "VolunteerQualification"("programId");
CREATE INDEX "MinistryTeam_departmentId_idx" ON "MinistryTeam"("departmentId");
CREATE INDEX "MinistryTeam_assistantLeaderUserId_idx" ON "MinistryTeam"("assistantLeaderUserId");

CREATE TABLE "MinistryDepartment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ministryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MinistryDepartment_ministryId_fkey" FOREIGN KEY ("ministryId") REFERENCES "Ministry" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "MinistryDepartment_ministryId_slug_key" ON "MinistryDepartment"("ministryId", "slug");
CREATE INDEX "MinistryDepartment_ministryId_idx" ON "MinistryDepartment"("ministryId");
CREATE INDEX "MinistryDepartment_isActive_idx" ON "MinistryDepartment"("isActive");

CREATE TABLE "VolunteerRole" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ministryId" TEXT,
    "teamId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "requiredSkillId" TEXT,
    "requiredProgramId" TEXT,
    "slotsRequired" INTEGER NOT NULL DEFAULT 1,
    "requireTeamMembership" BOOLEAN NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VolunteerRole_ministryId_fkey" FOREIGN KEY ("ministryId") REFERENCES "Ministry" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VolunteerRole_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "MinistryTeam" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "VolunteerRole_requiredSkillId_fkey" FOREIGN KEY ("requiredSkillId") REFERENCES "VolunteerSkillCatalog" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "VolunteerRole_requiredProgramId_fkey" FOREIGN KEY ("requiredProgramId") REFERENCES "TrainingProgram" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "VolunteerRole_slug_key" ON "VolunteerRole"("slug");
CREATE INDEX "VolunteerRole_ministryId_idx" ON "VolunteerRole"("ministryId");
CREATE INDEX "VolunteerRole_teamId_idx" ON "VolunteerRole"("teamId");
CREATE INDEX "VolunteerRole_isActive_idx" ON "VolunteerRole"("isActive");
CREATE INDEX "VolunteerRole_requiredSkillId_idx" ON "VolunteerRole"("requiredSkillId");
CREATE INDEX "VolunteerRole_requiredProgramId_idx" ON "VolunteerRole"("requiredProgramId");

CREATE TABLE "VolunteerMinistryRequirement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ministryId" TEXT NOT NULL,
    "teamId" TEXT,
    "roleId" TEXT,
    "skillId" TEXT,
    "programId" TEXT,
    "minAgeYears" INTEGER,
    "requireTeamMembership" BOOLEAN NOT NULL DEFAULT 0,
    "blockIfExpired" BOOLEAN NOT NULL DEFAULT 1,
    "isMandatory" BOOLEAN NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VolunteerMinistryRequirement_ministryId_fkey" FOREIGN KEY ("ministryId") REFERENCES "Ministry" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VolunteerMinistryRequirement_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "MinistryTeam" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "VolunteerMinistryRequirement_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "VolunteerRole" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "VolunteerMinistryRequirement_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "VolunteerSkillCatalog" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "VolunteerMinistryRequirement_programId_fkey" FOREIGN KEY ("programId") REFERENCES "TrainingProgram" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "VolunteerMinistryRequirement_ministryId_idx" ON "VolunteerMinistryRequirement"("ministryId");
CREATE INDEX "VolunteerMinistryRequirement_teamId_idx" ON "VolunteerMinistryRequirement"("teamId");
CREATE INDEX "VolunteerMinistryRequirement_roleId_idx" ON "VolunteerMinistryRequirement"("roleId");
CREATE INDEX "VolunteerMinistryRequirement_skillId_idx" ON "VolunteerMinistryRequirement"("skillId");
CREATE INDEX "VolunteerMinistryRequirement_programId_idx" ON "VolunteerMinistryRequirement"("programId");

CREATE TABLE "VolunteerSubstitution" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assignmentId" TEXT NOT NULL,
    "originalMemberId" TEXT NOT NULL,
    "substituteMemberId" TEXT,
    "replacementAssignmentId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'requested',
    "reason" TEXT,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VolunteerSubstitution_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "ServiceAssignment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VolunteerSubstitution_originalMemberId_fkey" FOREIGN KEY ("originalMemberId") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VolunteerSubstitution_substituteMemberId_fkey" FOREIGN KEY ("substituteMemberId") REFERENCES "Member" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "VolunteerSubstitution_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "VolunteerSubstitution_assignmentId_idx" ON "VolunteerSubstitution"("assignmentId");
CREATE INDEX "VolunteerSubstitution_originalMemberId_idx" ON "VolunteerSubstitution"("originalMemberId");
CREATE INDEX "VolunteerSubstitution_substituteMemberId_idx" ON "VolunteerSubstitution"("substituteMemberId");
CREATE INDEX "VolunteerSubstitution_status_idx" ON "VolunteerSubstitution"("status");

CREATE TABLE "VolunteerHourCorrection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assignmentId" TEXT NOT NULL,
    "oldMinutes" INTEGER NOT NULL,
    "newMinutes" INTEGER NOT NULL,
    "reason" TEXT,
    "actorId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VolunteerHourCorrection_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "ServiceAssignment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VolunteerHourCorrection_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "VolunteerHourCorrection_assignmentId_idx" ON "VolunteerHourCorrection"("assignmentId");
CREATE INDEX "VolunteerHourCorrection_actorId_idx" ON "VolunteerHourCorrection"("actorId");
CREATE INDEX "VolunteerHourCorrection_createdAt_idx" ON "VolunteerHourCorrection"("createdAt");

CREATE TABLE "VolunteerRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "ministryId" TEXT,
    "teamId" TEXT,
    "assignmentId" TEXT,
    "note" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VolunteerRequest_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VolunteerRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "VolunteerRequest_memberId_idx" ON "VolunteerRequest"("memberId");
CREATE INDEX "VolunteerRequest_type_idx" ON "VolunteerRequest"("type");
CREATE INDEX "VolunteerRequest_status_idx" ON "VolunteerRequest"("status");
CREATE INDEX "VolunteerRequest_ministryId_idx" ON "VolunteerRequest"("ministryId");
CREATE INDEX "VolunteerRequest_teamId_idx" ON "VolunteerRequest"("teamId");

CREATE TABLE "VolunteerOnboardingTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ministryId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VolunteerOnboardingTemplate_ministryId_fkey" FOREIGN KEY ("ministryId") REFERENCES "Ministry" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "VolunteerOnboardingTemplate_slug_key" ON "VolunteerOnboardingTemplate"("slug");
CREATE INDEX "VolunteerOnboardingTemplate_ministryId_idx" ON "VolunteerOnboardingTemplate"("ministryId");
CREATE INDEX "VolunteerOnboardingTemplate_isActive_idx" ON "VolunteerOnboardingTemplate"("isActive");

CREATE TABLE "VolunteerOnboardingItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isRequired" BOOLEAN NOT NULL DEFAULT 1,
    "programId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VolunteerOnboardingItem_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "VolunteerOnboardingTemplate" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VolunteerOnboardingItem_programId_fkey" FOREIGN KEY ("programId") REFERENCES "TrainingProgram" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "VolunteerOnboardingItem_templateId_idx" ON "VolunteerOnboardingItem"("templateId");
CREATE INDEX "VolunteerOnboardingItem_sortOrder_idx" ON "VolunteerOnboardingItem"("sortOrder");

CREATE TABLE "VolunteerOnboardingProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'not_started',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VolunteerOnboardingProgress_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VolunteerOnboardingProgress_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "VolunteerOnboardingTemplate" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "VolunteerOnboardingProgress_memberId_templateId_key" ON "VolunteerOnboardingProgress"("memberId", "templateId");
CREATE INDEX "VolunteerOnboardingProgress_memberId_idx" ON "VolunteerOnboardingProgress"("memberId");
CREATE INDEX "VolunteerOnboardingProgress_templateId_idx" ON "VolunteerOnboardingProgress"("templateId");
CREATE INDEX "VolunteerOnboardingProgress_status_idx" ON "VolunteerOnboardingProgress"("status");

CREATE TABLE "VolunteerOnboardingItemCompletion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "progressId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "completedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VolunteerOnboardingItemCompletion_progressId_fkey" FOREIGN KEY ("progressId") REFERENCES "VolunteerOnboardingProgress" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VolunteerOnboardingItemCompletion_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "VolunteerOnboardingItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "VolunteerOnboardingItemCompletion_progressId_itemId_key" ON "VolunteerOnboardingItemCompletion"("progressId", "itemId");
CREATE INDEX "VolunteerOnboardingItemCompletion_progressId_idx" ON "VolunteerOnboardingItemCompletion"("progressId");
CREATE INDEX "VolunteerOnboardingItemCompletion_itemId_idx" ON "VolunteerOnboardingItemCompletion"("itemId");
