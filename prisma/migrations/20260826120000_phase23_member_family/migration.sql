-- Phase 23: Member & Family Management

PRAGMA foreign_keys=OFF;

-- MembershipType
CREATE TABLE "MembershipType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MembershipType_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "MembershipType_slug_key" ON "MembershipType"("slug");
CREATE INDEX "MembershipType_isActive_idx" ON "MembershipType"("isActive");
CREATE INDEX "MembershipType_sortOrder_idx" ON "MembershipType"("sortOrder");

-- Rebuild Household with familyReference + status
CREATE TABLE "new_Household" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "familyReference" TEXT,
    "name" TEXT NOT NULL,
    "primaryMemberId" TEXT,
    "addressNote" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Household_primaryMemberId_fkey" FOREIGN KEY ("primaryMemberId") REFERENCES "Member" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Household" ("id", "name", "primaryMemberId", "addressNote", "createdAt", "updatedAt")
SELECT "id", "name", "primaryMemberId", "addressNote", "createdAt", "updatedAt" FROM "Household";
DROP TABLE "Household";
ALTER TABLE "new_Household" RENAME TO "Household";
CREATE UNIQUE INDEX "Household_familyReference_key" ON "Household"("familyReference");
CREATE INDEX "Household_primaryMemberId_idx" ON "Household"("primaryMemberId");
CREATE INDEX "Household_status_idx" ON "Household"("status");
CREATE INDEX "Household_familyReference_idx" ON "Household"("familyReference");

-- Rebuild HouseholdMembership with start/end dates
CREATE TABLE "new_HouseholdMembership" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "householdId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "relationship" TEXT NOT NULL DEFAULT 'other',
    "isPrimaryContact" BOOLEAN NOT NULL DEFAULT 0,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "HouseholdMembership_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "HouseholdMembership_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_HouseholdMembership" ("id", "householdId", "memberId", "relationship", "isPrimaryContact", "createdAt", "updatedAt")
SELECT "id", "householdId", "memberId", "relationship", "isPrimaryContact", "createdAt", "updatedAt" FROM "HouseholdMembership";
DROP TABLE "HouseholdMembership";
ALTER TABLE "new_HouseholdMembership" RENAME TO "HouseholdMembership";
CREATE UNIQUE INDEX "HouseholdMembership_householdId_memberId_key" ON "HouseholdMembership"("householdId", "memberId");
CREATE INDEX "HouseholdMembership_memberId_idx" ON "HouseholdMembership"("memberId");
CREATE INDEX "HouseholdMembership_householdId_idx" ON "HouseholdMembership"("householdId");

-- Rebuild Member with type, joining info, directory contact flag, archivedAt
CREATE TABLE "new_Member" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "membershipNumber" TEXT,
    "displayName" TEXT,
    "preferredName" TEXT,
    "preferredLanguage" TEXT NOT NULL DEFAULT 'en',
    "status" TEXT NOT NULL DEFAULT 'approved',
    "membershipTypeId" TEXT,
    "dateJoined" DATETIME,
    "dateOfBirth" DATETIME,
    "gender" TEXT,
    "addressNote" TEXT,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "baptismDate" DATETIME,
    "baptismNote" TEXT,
    "joiningMethod" TEXT,
    "previousChurch" TEXT,
    "householdId" TEXT,
    "directoryVisibility" TEXT NOT NULL DEFAULT 'private',
    "showProfilePhoto" BOOLEAN NOT NULL DEFAULT 0,
    "showDisplayName" BOOLEAN NOT NULL DEFAULT 1,
    "showMinistry" BOOLEAN NOT NULL DEFAULT 0,
    "showContactButton" BOOLEAN NOT NULL DEFAULT 0,
    "archivedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Member_membershipTypeId_fkey" FOREIGN KEY ("membershipTypeId") REFERENCES "MembershipType" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Member_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Member" (
  "id", "userId", "membershipNumber", "displayName", "preferredName", "preferredLanguage", "status",
  "dateJoined", "dateOfBirth", "gender", "addressNote", "emergencyContactName", "emergencyContactPhone",
  "baptismDate", "baptismNote", "householdId", "directoryVisibility", "showProfilePhoto", "showDisplayName",
  "showMinistry", "createdAt", "updatedAt"
)
SELECT
  "id", "userId", "membershipNumber", "displayName", "preferredName", "preferredLanguage", "status",
  "dateJoined", "dateOfBirth", "gender", "addressNote", "emergencyContactName", "emergencyContactPhone",
  "baptismDate", "baptismNote", "householdId", "directoryVisibility", "showProfilePhoto", "showDisplayName",
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
CREATE INDEX "Member_membershipTypeId_idx" ON "Member"("membershipTypeId");

CREATE TABLE "BaptismRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "baptismDate" DATETIME NOT NULL,
    "location" TEXT,
    "officiant" TEXT,
    "baptismCategory" TEXT,
    "certificateRef" TEXT,
    "documentPath" TEXT,
    "notes" TEXT,
    "recordedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BaptismRecord_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BaptismRecord_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "BaptismRecord_memberId_idx" ON "BaptismRecord"("memberId");
CREATE INDEX "BaptismRecord_baptismDate_idx" ON "BaptismRecord"("baptismDate");

CREATE TABLE "ConfirmationRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "confirmedAt" DATETIME NOT NULL,
    "location" TEXT,
    "officiant" TEXT,
    "certificateRef" TEXT,
    "documentPath" TEXT,
    "notes" TEXT,
    "recordedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ConfirmationRecord_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ConfirmationRecord_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "ConfirmationRecord_memberId_idx" ON "ConfirmationRecord"("memberId");
CREATE INDEX "ConfirmationRecord_confirmedAt_idx" ON "ConfirmationRecord"("confirmedAt");

CREATE TABLE "MembershipTransfer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'requested',
    "otherChurchName" TEXT,
    "otherChurchNote" TEXT,
    "reason" TEXT,
    "effectiveDate" DATETIME,
    "reviewedById" TEXT,
    "reviewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MembershipTransfer_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MembershipTransfer_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "MembershipTransfer_memberId_idx" ON "MembershipTransfer"("memberId");
CREATE INDEX "MembershipTransfer_status_idx" ON "MembershipTransfer"("status");
CREATE INDEX "MembershipTransfer_direction_idx" ON "MembershipTransfer"("direction");

CREATE TABLE "MemberCard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "issuedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME,
    "revokedAt" DATETIME,
    "issuedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MemberCard_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MemberCard_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "MemberCard_tokenHash_key" ON "MemberCard"("tokenHash");
CREATE INDEX "MemberCard_memberId_idx" ON "MemberCard"("memberId");
CREATE INDEX "MemberCard_status_idx" ON "MemberCard"("status");

CREATE TABLE "MemberMergeRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceMemberId" TEXT NOT NULL,
    "targetMemberId" TEXT NOT NULL,
    "performedById" TEXT,
    "notes" TEXT,
    "conflictSummary" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MemberMergeRecord_sourceMemberId_fkey" FOREIGN KEY ("sourceMemberId") REFERENCES "Member" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MemberMergeRecord_targetMemberId_fkey" FOREIGN KEY ("targetMemberId") REFERENCES "Member" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MemberMergeRecord_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "MemberMergeRecord_sourceMemberId_idx" ON "MemberMergeRecord"("sourceMemberId");
CREATE INDEX "MemberMergeRecord_targetMemberId_idx" ON "MemberMergeRecord"("targetMemberId");
CREATE INDEX "MemberMergeRecord_createdAt_idx" ON "MemberMergeRecord"("createdAt");

CREATE TABLE "MemberImportJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'uploaded',
    "fileName" TEXT NOT NULL,
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "validRows" INTEGER NOT NULL DEFAULT 0,
    "invalidRows" INTEGER NOT NULL DEFAULT 0,
    "duplicateRows" INTEGER NOT NULL DEFAULT 0,
    "importedRows" INTEGER NOT NULL DEFAULT 0,
    "previewJson" TEXT,
    "errorReport" TEXT,
    "createdById" TEXT,
    "confirmedAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MemberImportJob_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "MemberImportJob_status_idx" ON "MemberImportJob"("status");
CREATE INDEX "MemberImportJob_createdAt_idx" ON "MemberImportJob"("createdAt");

PRAGMA foreign_keys=ON;
