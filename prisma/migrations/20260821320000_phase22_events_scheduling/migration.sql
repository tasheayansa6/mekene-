-- Phase 22: Advanced event scheduling (venues capacity, programs, resources, history)

PRAGMA foreign_keys=OFF;

-- Extend EventLocation with venue capacity/facilities
CREATE TABLE "new_EventLocation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "address" TEXT,
    "description" TEXT,
    "capacity" INTEGER,
    "facilities" TEXT,
    "latitude" REAL,
    "longitude" REAL,
    "mapUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_EventLocation" ("id", "name", "slug", "address", "description", "latitude", "longitude", "mapUrl", "isActive", "createdAt", "updatedAt")
SELECT "id", "name", "slug", "address", "description", "latitude", "longitude", "mapUrl", "isActive", "createdAt", "updatedAt" FROM "EventLocation";
DROP TABLE "EventLocation";
ALTER TABLE "new_EventLocation" RENAME TO "EventLocation";
CREATE UNIQUE INDEX "EventLocation_slug_key" ON "EventLocation"("slug");
CREATE INDEX "EventLocation_isActive_idx" ON "EventLocation"("isActive");

-- Extend Event with worship/venue override flags
CREATE TABLE "new_Event" (
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
    "isOnline" BOOLEAN NOT NULL DEFAULT 0,
    "isHybrid" BOOLEAN NOT NULL DEFAULT 0,
    "meetingUrl" TEXT,
    "locationVisibility" TEXT NOT NULL DEFAULT 'public',
    "startAt" DATETIME NOT NULL,
    "endAt" DATETIME NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Addis_Ababa',
    "recurrence" TEXT NOT NULL DEFAULT 'none',
    "recurrenceInterval" INTEGER NOT NULL DEFAULT 1,
    "recurrenceUntil" DATETIME,
    "seriesParentId" TEXT,
    "featuredImageUrl" TEXT,
    "featuredImageAlt" TEXT,
    "registrationRequired" BOOLEAN NOT NULL DEFAULT 0,
    "registrationUrl" TEXT,
    "capacity" INTEGER,
    "allowOverVenueCapacity" BOOLEAN NOT NULL DEFAULT 0,
    "registrationDeadline" DATETIME,
    "waitlistEnabled" BOOLEAN NOT NULL DEFAULT 0,
    "allowGuestRegistration" BOOLEAN NOT NULL DEFAULT 0,
    "registrationAccess" TEXT NOT NULL DEFAULT 'public',
    "reminderOffsetsMinutes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "isFeatured" BOOLEAN NOT NULL DEFAULT 0,
    "isWorshipService" BOOLEAN NOT NULL DEFAULT 0,
    "serviceLabel" TEXT,
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
    CONSTRAINT "Event_seriesParentId_fkey" FOREIGN KEY ("seriesParentId") REFERENCES "Event" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Event_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Event" (
  "id", "title", "slug", "description", "shortDescription", "categoryId", "ministryId", "organizerLeaderId", "organizerName",
  "locationId", "isOnline", "isHybrid", "meetingUrl", "locationVisibility", "startAt", "endAt", "timezone",
  "recurrence", "recurrenceInterval", "recurrenceUntil", "seriesParentId", "featuredImageUrl", "featuredImageAlt",
  "registrationRequired", "registrationUrl", "capacity", "registrationDeadline", "waitlistEnabled",
  "allowGuestRegistration", "registrationAccess", "reminderOffsetsMinutes", "status", "isFeatured",
  "seoTitle", "seoDescription", "ogImageUrl", "authorId", "publishedAt", "publishAt", "createdAt", "updatedAt"
)
SELECT
  "id", "title", "slug", "description", "shortDescription", "categoryId", "ministryId", "organizerLeaderId", "organizerName",
  "locationId", "isOnline", "isHybrid", "meetingUrl", "locationVisibility", "startAt", "endAt", "timezone",
  "recurrence", "recurrenceInterval", "recurrenceUntil", "seriesParentId", "featuredImageUrl", "featuredImageAlt",
  "registrationRequired", "registrationUrl", "capacity", "registrationDeadline", "waitlistEnabled",
  "allowGuestRegistration", "registrationAccess", "reminderOffsetsMinutes", "status", "isFeatured",
  "seoTitle", "seoDescription", "ogImageUrl", "authorId", "publishedAt", "publishAt", "createdAt", "updatedAt"
FROM "Event";
DROP TABLE "Event";
ALTER TABLE "new_Event" RENAME TO "Event";
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
CREATE INDEX "Event_seriesParentId_idx" ON "Event"("seriesParentId");
CREATE INDEX "Event_registrationAccess_idx" ON "Event"("registrationAccess");
CREATE INDEX "Event_isWorshipService_idx" ON "Event"("isWorshipService");

CREATE TABLE "ServiceProgram" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "title" TEXT,
    "notes" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ServiceProgram_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ServiceProgram_eventId_key" ON "ServiceProgram"("eventId");

CREATE TABLE "ServiceProgramItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "programId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "itemType" TEXT NOT NULL DEFAULT 'other',
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "durationMinutes" INTEGER,
    "responsibleLabel" TEXT,
    "memberId" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'planned',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ServiceProgramItem_programId_fkey" FOREIGN KEY ("programId") REFERENCES "ServiceProgram" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "ServiceProgramItem_programId_idx" ON "ServiceProgramItem"("programId");
CREATE INDEX "ServiceProgramItem_sortOrder_idx" ON "ServiceProgramItem"("sortOrder");

CREATE TABLE "BookableResource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL DEFAULT 'equipment',
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'available',
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "BookableResource_slug_key" ON "BookableResource"("slug");
CREATE INDEX "BookableResource_status_idx" ON "BookableResource"("status");
CREATE INDEX "BookableResource_isActive_idx" ON "BookableResource"("isActive");
CREATE INDEX "BookableResource_resourceType_idx" ON "BookableResource"("resourceType");

CREATE TABLE "ResourceReservation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "resourceId" TEXT NOT NULL,
    "eventId" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "startAt" DATETIME NOT NULL,
    "endAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ResourceReservation_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "BookableResource" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ResourceReservation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ResourceReservation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "ResourceReservation_resourceId_idx" ON "ResourceReservation"("resourceId");
CREATE INDEX "ResourceReservation_eventId_idx" ON "ResourceReservation"("eventId");
CREATE INDEX "ResourceReservation_startAt_idx" ON "ResourceReservation"("startAt");
CREATE INDEX "ResourceReservation_endAt_idx" ON "ResourceReservation"("endAt");
CREATE INDEX "ResourceReservation_status_idx" ON "ResourceReservation"("status");

CREATE TABLE "EventChangeHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "changedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EventChangeHistory_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EventChangeHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "EventChangeHistory_eventId_idx" ON "EventChangeHistory"("eventId");
CREATE INDEX "EventChangeHistory_createdAt_idx" ON "EventChangeHistory"("createdAt");
CREATE INDEX "EventChangeHistory_field_idx" ON "EventChangeHistory"("field");

CREATE TABLE "RecurringEventRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "frequency" TEXT NOT NULL DEFAULT 'weekly',
    "interval" INTEGER NOT NULL DEFAULT 1,
    "byWeekday" TEXT,
    "until" DATETIME,
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Addis_Ababa',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "RecurringEventRule_eventId_key" ON "RecurringEventRule"("eventId");
CREATE INDEX "RecurringEventRule_until_idx" ON "RecurringEventRule"("until");

PRAGMA foreign_keys=ON;
