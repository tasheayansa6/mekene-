-- Phase 19: Membership extensions & Pastoral Care

PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Member" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "membershipNumber" TEXT,
    "displayName" TEXT,
    "preferredName" TEXT,
    "preferredLanguage" TEXT NOT NULL DEFAULT 'en',
    "status" TEXT NOT NULL DEFAULT 'approved',
    "dateJoined" DATETIME,
    "dateOfBirth" DATETIME,
    "gender" TEXT,
    "addressNote" TEXT,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "baptismDate" DATETIME,
    "baptismNote" TEXT,
    "householdId" TEXT,
    "directoryVisibility" TEXT NOT NULL DEFAULT 'private',
    "showProfilePhoto" BOOLEAN NOT NULL DEFAULT 0,
    "showDisplayName" BOOLEAN NOT NULL DEFAULT 1,
    "showMinistry" BOOLEAN NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Member_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Member" (
  "id", "userId", "membershipNumber", "displayName", "preferredName", "preferredLanguage", "status",
  "dateJoined", "dateOfBirth", "gender", "addressNote", "emergencyContactName", "emergencyContactPhone",
  "baptismDate", "baptismNote", "householdId", "directoryVisibility", "showProfilePhoto", "showDisplayName",
  "showMinistry", "createdAt", "updatedAt"
)
SELECT
  "id", "userId", "membershipNumber", "displayName", NULL, "preferredLanguage", "status",
  "dateJoined", NULL, NULL, NULL, NULL, NULL,
  NULL, NULL, "householdId", "directoryVisibility", "showProfilePhoto", "showDisplayName",
  "showMinistry", "createdAt", "updatedAt"
FROM "Member";
DROP TABLE "Member";
ALTER TABLE "new_Member" RENAME TO "Member";
CREATE UNIQUE INDEX "Member_userId_key" ON "Member"("userId");
CREATE UNIQUE INDEX "Member_membershipNumber_key" ON "Member"("membershipNumber");
CREATE INDEX "Member_status_idx" ON "Member"("status");
CREATE INDEX "Member_householdId_idx" ON "Member"("householdId");
CREATE INDEX "Member_membershipNumber_idx" ON "Member"("membershipNumber");
CREATE INDEX "Member_dateJoined_idx" ON "Member"("dateJoined");

CREATE TABLE "HouseholdMembership" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "householdId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "relationship" TEXT NOT NULL DEFAULT 'other',
    "isPrimaryContact" BOOLEAN NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "HouseholdMembership_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "HouseholdMembership_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "HouseholdMembership_householdId_memberId_key" ON "HouseholdMembership"("householdId", "memberId");
CREATE INDEX "HouseholdMembership_memberId_idx" ON "HouseholdMembership"("memberId");
CREATE INDEX "HouseholdMembership_householdId_idx" ON "HouseholdMembership"("householdId");

INSERT INTO "HouseholdMembership" ("id", "householdId", "memberId", "relationship", "isPrimaryContact", "createdAt", "updatedAt")
SELECT lower(hex(randomblob(8))), "householdId", "id", 'other', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Member" WHERE "householdId" IS NOT NULL;

CREATE TABLE "PastoralCareCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "PastoralCareCategory_slug_key" ON "PastoralCareCategory"("slug");
CREATE INDEX "PastoralCareCategory_isActive_idx" ON "PastoralCareCategory"("isActive");
CREATE INDEX "PastoralCareCategory_sortOrder_idx" ON "PastoralCareCategory"("sortOrder");

CREATE TABLE "PastoralCareCase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "categoryId" TEXT,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "status" TEXT NOT NULL DEFAULT 'open',
    "assignedToId" TEXT,
    "createdById" TEXT NOT NULL,
    "openedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PastoralCareCase_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PastoralCareCase_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "PastoralCareCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PastoralCareCase_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PastoralCareCase_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "PastoralCareCase_memberId_idx" ON "PastoralCareCase"("memberId");
CREATE INDEX "PastoralCareCase_categoryId_idx" ON "PastoralCareCase"("categoryId");
CREATE INDEX "PastoralCareCase_status_idx" ON "PastoralCareCase"("status");
CREATE INDEX "PastoralCareCase_priority_idx" ON "PastoralCareCase"("priority");
CREATE INDEX "PastoralCareCase_assignedToId_idx" ON "PastoralCareCase"("assignedToId");
CREATE INDEX "PastoralCareCase_openedAt_idx" ON "PastoralCareCase"("openedAt");
CREATE INDEX "PastoralCareCase_createdAt_idx" ON "PastoralCareCase"("createdAt");

CREATE TABLE "PastoralAssignmentHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "previousAssigneeId" TEXT,
    "newAssigneeId" TEXT,
    "changedById" TEXT,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PastoralAssignmentHistory_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "PastoralCareCase" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PastoralAssignmentHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "PastoralAssignmentHistory_caseId_idx" ON "PastoralAssignmentHistory"("caseId");
CREATE INDEX "PastoralAssignmentHistory_createdAt_idx" ON "PastoralAssignmentHistory"("createdAt");

CREATE TABLE "PastoralCareNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "visibility" TEXT NOT NULL DEFAULT 'case_team',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PastoralCareNote_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "PastoralCareCase" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PastoralCareNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "PastoralCareNote_caseId_idx" ON "PastoralCareNote"("caseId");
CREATE INDEX "PastoralCareNote_authorId_idx" ON "PastoralCareNote"("authorId");
CREATE INDEX "PastoralCareNote_createdAt_idx" ON "PastoralCareNote"("createdAt");

CREATE TABLE "PastoralVisit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "caseId" TEXT,
    "assignedToId" TEXT,
    "createdById" TEXT NOT NULL,
    "scheduledAt" DATETIME NOT NULL,
    "completedAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "locationType" TEXT NOT NULL DEFAULT 'church',
    "locationNote" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PastoralVisit_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PastoralVisit_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "PastoralCareCase" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PastoralVisit_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PastoralVisit_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "PastoralVisit_memberId_idx" ON "PastoralVisit"("memberId");
CREATE INDEX "PastoralVisit_caseId_idx" ON "PastoralVisit"("caseId");
CREATE INDEX "PastoralVisit_assignedToId_idx" ON "PastoralVisit"("assignedToId");
CREATE INDEX "PastoralVisit_scheduledAt_idx" ON "PastoralVisit"("scheduledAt");
CREATE INDEX "PastoralVisit_status_idx" ON "PastoralVisit"("status");

CREATE TABLE "PastoralFollowUp" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT,
    "memberId" TEXT,
    "assignedToId" TEXT,
    "createdById" TEXT NOT NULL,
    "task" TEXT NOT NULL,
    "dueDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PastoralFollowUp_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "PastoralCareCase" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PastoralFollowUp_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PastoralFollowUp_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "PastoralFollowUp_caseId_idx" ON "PastoralFollowUp"("caseId");
CREATE INDEX "PastoralFollowUp_memberId_idx" ON "PastoralFollowUp"("memberId");
CREATE INDEX "PastoralFollowUp_assignedToId_idx" ON "PastoralFollowUp"("assignedToId");
CREATE INDEX "PastoralFollowUp_dueDate_idx" ON "PastoralFollowUp"("dueDate");
CREATE INDEX "PastoralFollowUp_status_idx" ON "PastoralFollowUp"("status");

CREATE TABLE "MemberProfileChangeRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "payload" TEXT NOT NULL,
    "staffNote" TEXT,
    "reviewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MemberProfileChangeRequest_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MemberProfileChangeRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MemberProfileChangeRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "MemberProfileChangeRequest_memberId_idx" ON "MemberProfileChangeRequest"("memberId");
CREATE INDEX "MemberProfileChangeRequest_status_idx" ON "MemberProfileChangeRequest"("status");
CREATE INDEX "MemberProfileChangeRequest_createdAt_idx" ON "MemberProfileChangeRequest"("createdAt");

CREATE TABLE "MemberAdminNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MemberAdminNote_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MemberAdminNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "MemberAdminNote_memberId_idx" ON "MemberAdminNote"("memberId");
CREATE INDEX "MemberAdminNote_createdAt_idx" ON "MemberAdminNote"("createdAt");

CREATE TABLE "MemberDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT,
    "fileMime" TEXT,
    "fileSize" INTEGER,
    "retentionUntil" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MemberDocument_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MemberDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "MemberDocument_memberId_idx" ON "MemberDocument"("memberId");
CREATE INDEX "MemberDocument_createdAt_idx" ON "MemberDocument"("createdAt");

CREATE TABLE "PastoralAccessLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actorId" TEXT,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "action" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PastoralAccessLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "PastoralAccessLog_actorId_idx" ON "PastoralAccessLog"("actorId");
CREATE INDEX "PastoralAccessLog_resource_idx" ON "PastoralAccessLog"("resource");
CREATE INDEX "PastoralAccessLog_resourceId_idx" ON "PastoralAccessLog"("resourceId");
CREATE INDEX "PastoralAccessLog_createdAt_idx" ON "PastoralAccessLog"("createdAt");

PRAGMA foreign_keys=ON;
