-- Phase 10 events: replace stub Event and add categories, locations, calendar fields

PRAGMA foreign_keys=OFF;

DROP TABLE IF EXISTS "Event";

CREATE TABLE "EventCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "EventCategory_slug_key" ON "EventCategory"("slug");
CREATE INDEX "EventCategory_sortOrder_idx" ON "EventCategory"("sortOrder");

CREATE TABLE "EventLocation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "address" TEXT,
    "description" TEXT,
    "latitude" REAL,
    "longitude" REAL,
    "mapUrl" TEXT,
    "isActive" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "EventLocation_slug_key" ON "EventLocation"("slug");
CREATE INDEX "EventLocation_isActive_idx" ON "EventLocation"("isActive");

CREATE TABLE "Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "shortDescription" TEXT,
    "categoryId" TEXT,
    "ministryId" TEXT,
    "organizerLeaderId" TEXT,
    "organizerName" TEXT,
    "locationId" TEXT,
    "isOnline" INTEGER NOT NULL DEFAULT 0,
    "meetingUrl" TEXT,
    "startAt" DATETIME NOT NULL,
    "endAt" DATETIME NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Addis_Ababa',
    "recurrence" TEXT NOT NULL DEFAULT 'none',
    "recurrenceInterval" INTEGER NOT NULL DEFAULT 1,
    "recurrenceUntil" DATETIME,
    "featuredImageUrl" TEXT,
    "featuredImageAlt" TEXT,
    "registrationRequired" INTEGER NOT NULL DEFAULT 0,
    "registrationUrl" TEXT,
    "capacity" INTEGER,
    "registrationDeadline" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "isFeatured" INTEGER NOT NULL DEFAULT 0,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "ogImageUrl" TEXT,
    "authorId" TEXT NOT NULL,
    "publishedAt" DATETIME,
    "publishAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Event_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "EventCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Event_ministryId_fkey" FOREIGN KEY ("ministryId") REFERENCES "Ministry" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Event_organizerLeaderId_fkey" FOREIGN KEY ("organizerLeaderId") REFERENCES "Leader" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Event_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "EventLocation" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Event_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Event_slug_key" ON "Event"("slug");
CREATE INDEX "Event_status_idx" ON "Event"("status");
CREATE INDEX "Event_slug_idx" ON "Event"("slug");
CREATE INDEX "Event_startAt_idx" ON "Event"("startAt");
CREATE INDEX "Event_endAt_idx" ON "Event"("endAt");
CREATE INDEX "Event_categoryId_idx" ON "Event"("categoryId");
CREATE INDEX "Event_ministryId_idx" ON "Event"("ministryId");
CREATE INDEX "Event_locationId_idx" ON "Event"("locationId");
CREATE INDEX "Event_organizerLeaderId_idx" ON "Event"("organizerLeaderId");
CREATE INDEX "Event_isFeatured_idx" ON "Event"("isFeatured");
CREATE INDEX "Event_authorId_idx" ON "Event"("authorId");
CREATE INDEX "Event_isOnline_idx" ON "Event"("isOnline");

PRAGMA foreign_keys=ON;
