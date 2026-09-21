-- Phase 13: Church Membership & Member Management
-- Extends the existing Member table. Does not create a second User model.

PRAGMA foreign_keys=OFF;

CREATE TABLE "Household" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "primaryMemberId" TEXT,
    "addressNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "Member_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "membershipNumber" TEXT,
    "displayName" TEXT,
    "preferredLanguage" TEXT NOT NULL DEFAULT 'en',
    "status" TEXT NOT NULL DEFAULT 'approved',
    "dateJoined" DATETIME,
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

INSERT INTO "Member_new" (
    "id",
    "userId",
    "membershipNumber",
    "status",
    "dateJoined",
    "createdAt",
    "updatedAt"
)
SELECT
    "id",
    "userId",
    "membershipNumber",
    'active',
    "membershipDate",
    "createdAt",
    "updatedAt"
FROM "Member";

DROP TABLE "Member";
ALTER TABLE "Member_new" RENAME TO "Member";

CREATE UNIQUE INDEX "Member_userId_key" ON "Member"("userId");
CREATE UNIQUE INDEX "Member_membershipNumber_key" ON "Member"("membershipNumber");
CREATE INDEX "Member_status_idx" ON "Member"("status");
CREATE INDEX "Member_householdId_idx" ON "Member"("householdId");
CREATE INDEX "Member_membershipNumber_idx" ON "Member"("membershipNumber");

CREATE TABLE "Household_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "primaryMemberId" TEXT,
    "addressNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Household_primaryMemberId_fkey" FOREIGN KEY ("primaryMemberId") REFERENCES "Member" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "Household_new" SELECT * FROM "Household";
DROP TABLE "Household";
ALTER TABLE "Household_new" RENAME TO "Household";
CREATE INDEX "Household_primaryMemberId_idx" ON "Household"("primaryMemberId");

CREATE TABLE "MembershipApplication" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "memberId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "fullName" TEXT NOT NULL,
    "preferredContact" TEXT,
    "preferredLanguage" TEXT NOT NULL DEFAULT 'en',
    "howHeard" TEXT,
    "ministryInterests" TEXT,
    "applicantNote" TEXT,
    "reviewerMessage" TEXT,
    "reviewNotes" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" DATETIME,
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MembershipApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MembershipApplication_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MembershipApplication_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "MembershipApplication_userId_idx" ON "MembershipApplication"("userId");
CREATE INDEX "MembershipApplication_status_idx" ON "MembershipApplication"("status");
CREATE INDEX "MembershipApplication_submittedAt_idx" ON "MembershipApplication"("submittedAt");
CREATE INDEX "MembershipApplication_memberId_idx" ON "MembershipApplication"("memberId");
CREATE INDEX "MembershipApplication_reviewedById_idx" ON "MembershipApplication"("reviewedById");

CREATE TABLE "MembershipStatusHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT,
    "applicationId" TEXT,
    "oldStatus" TEXT,
    "newStatus" TEXT NOT NULL,
    "changedById" TEXT,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MembershipStatusHistory_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MembershipStatusHistory_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "MembershipApplication" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MembershipStatusHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "MembershipStatusHistory_memberId_idx" ON "MembershipStatusHistory"("memberId");
CREATE INDEX "MembershipStatusHistory_applicationId_idx" ON "MembershipStatusHistory"("applicationId");
CREATE INDEX "MembershipStatusHistory_createdAt_idx" ON "MembershipStatusHistory"("createdAt");

CREATE TABLE "MemberMinistry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "ministryId" TEXT NOT NULL,
    "roleLabel" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "joinedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MemberMinistry_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MemberMinistry_ministryId_fkey" FOREIGN KEY ("ministryId") REFERENCES "Ministry" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "MemberMinistry_memberId_ministryId_key" ON "MemberMinistry"("memberId", "ministryId");
CREATE INDEX "MemberMinistry_ministryId_idx" ON "MemberMinistry"("ministryId");
CREATE INDEX "MemberMinistry_status_idx" ON "MemberMinistry"("status");

CREATE TABLE "MinistryJoinRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "ministryId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" DATETIME,
    CONSTRAINT "MinistryJoinRequest_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MinistryJoinRequest_ministryId_fkey" FOREIGN KEY ("ministryId") REFERENCES "Ministry" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "MinistryJoinRequest_memberId_idx" ON "MinistryJoinRequest"("memberId");
CREATE INDEX "MinistryJoinRequest_ministryId_idx" ON "MinistryJoinRequest"("ministryId");
CREATE INDEX "MinistryJoinRequest_status_idx" ON "MinistryJoinRequest"("status");

PRAGMA foreign_keys=ON;
