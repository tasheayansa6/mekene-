-- Phase 11 prayer: replace stub PrayerRequest with privacy-aware models

PRAGMA foreign_keys=OFF;

DROP TABLE IF EXISTS "PrayerInteraction";
DROP TABLE IF EXISTS "PrayerNote";
DROP TABLE IF EXISTS "PrayerRequest";
DROP TABLE IF EXISTS "PrayerCategory";

CREATE TABLE "PrayerCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "PrayerCategory_slug_key" ON "PrayerCategory"("slug");
CREATE INDEX "PrayerCategory_sortOrder_idx" ON "PrayerCategory"("sortOrder");

CREATE TABLE "PrayerRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "userId" TEXT,
    "guestName" TEXT,
    "guestEmail" TEXT,
    "isAnonymous" INTEGER NOT NULL DEFAULT 0,
    "visibility" TEXT NOT NULL DEFAULT 'private',
    "status" TEXT NOT NULL DEFAULT 'new',
    "categoryId" TEXT,
    "assignedToId" TEXT,
    "publicApproved" INTEGER NOT NULL DEFAULT 0,
    "approvedAt" DATETIME,
    "answeredAt" DATETIME,
    "archivedAt" DATETIME,
    "rejectedAt" DATETIME,
    "prayedCount" INTEGER NOT NULL DEFAULT 0,
    "requesterMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PrayerRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PrayerRequest_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "PrayerCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PrayerRequest_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "PrayerRequest_status_idx" ON "PrayerRequest"("status");
CREATE INDEX "PrayerRequest_visibility_publicApproved_idx" ON "PrayerRequest"("visibility", "publicApproved");
CREATE INDEX "PrayerRequest_userId_idx" ON "PrayerRequest"("userId");
CREATE INDEX "PrayerRequest_assignedToId_idx" ON "PrayerRequest"("assignedToId");
CREATE INDEX "PrayerRequest_categoryId_idx" ON "PrayerRequest"("categoryId");
CREATE INDEX "PrayerRequest_createdAt_idx" ON "PrayerRequest"("createdAt");

CREATE TABLE "PrayerNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PrayerNote_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "PrayerRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PrayerNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "PrayerNote_requestId_idx" ON "PrayerNote"("requestId");

CREATE TABLE "PrayerInteraction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "actorHash" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PrayerInteraction_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "PrayerRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PrayerInteraction_requestId_actorHash_key" ON "PrayerInteraction"("requestId", "actorHash");
CREATE INDEX "PrayerInteraction_requestId_idx" ON "PrayerInteraction"("requestId");

PRAGMA foreign_keys=ON;
