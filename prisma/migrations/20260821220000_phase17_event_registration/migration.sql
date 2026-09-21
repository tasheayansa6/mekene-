-- Phase 17: Event registration, waitlist, invitations, speakers

PRAGMA foreign_keys=OFF;

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
    "registrationDeadline" DATETIME,
    "waitlistEnabled" BOOLEAN NOT NULL DEFAULT 0,
    "allowGuestRegistration" BOOLEAN NOT NULL DEFAULT 0,
    "registrationAccess" TEXT NOT NULL DEFAULT 'public',
    "reminderOffsetsMinutes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "isFeatured" BOOLEAN NOT NULL DEFAULT 0,
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
  "id", "title", "slug", "description", "shortDescription", "categoryId", "ministryId",
  "organizerLeaderId", "organizerName", "locationId", "isOnline", "isHybrid", "meetingUrl",
  "locationVisibility", "startAt", "endAt", "timezone", "recurrence", "recurrenceInterval",
  "recurrenceUntil", "seriesParentId", "featuredImageUrl", "featuredImageAlt",
  "registrationRequired", "registrationUrl", "capacity", "registrationDeadline",
  "waitlistEnabled", "allowGuestRegistration", "registrationAccess", "reminderOffsetsMinutes",
  "status", "isFeatured", "seoTitle", "seoDescription", "ogImageUrl", "authorId",
  "publishedAt", "publishAt", "createdAt", "updatedAt"
)
SELECT
  "id", "title", "slug", "description", "shortDescription", "categoryId", "ministryId",
  "organizerLeaderId", "organizerName", "locationId", "isOnline", 0, "meetingUrl",
  'public', "startAt", "endAt", "timezone", "recurrence", "recurrenceInterval",
  "recurrenceUntil", NULL, "featuredImageUrl", "featuredImageAlt",
  "registrationRequired", "registrationUrl", "capacity", "registrationDeadline",
  0, 0, 'public', NULL,
  "status", "isFeatured", "seoTitle", "seoDescription", "ogImageUrl", "authorId",
  "publishedAt", "publishAt", "createdAt", "updatedAt"
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

CREATE TABLE "EventSpeaker" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "bio" TEXT,
    "profileUrl" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EventSpeaker_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "EventSpeaker_eventId_idx" ON "EventSpeaker"("eventId");
CREATE INDEX "EventSpeaker_displayOrder_idx" ON "EventSpeaker"("displayOrder");

CREATE TABLE "EventRegistration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reference" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT,
    "guestName" TEXT,
    "guestEmail" TEXT,
    "guestPhone" TEXT,
    "guestPartySize" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'registered',
    "waitlistPosition" INTEGER,
    "notes" TEXT,
    "registeredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelledAt" DATETIME,
    "confirmedAt" DATETIME,
    "confirmationSentAt" DATETIME,
    "promotedAt" DATETIME,
    "recordedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EventRegistration_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EventRegistration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "EventRegistration_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "EventRegistration_reference_key" ON "EventRegistration"("reference");
CREATE UNIQUE INDEX "EventRegistration_eventId_userId_key" ON "EventRegistration"("eventId", "userId");
CREATE INDEX "EventRegistration_eventId_idx" ON "EventRegistration"("eventId");
CREATE INDEX "EventRegistration_userId_idx" ON "EventRegistration"("userId");
CREATE INDEX "EventRegistration_status_idx" ON "EventRegistration"("status");
CREATE INDEX "EventRegistration_registeredAt_idx" ON "EventRegistration"("registeredAt");
CREATE INDEX "EventRegistration_guestEmail_idx" ON "EventRegistration"("guestEmail");

CREATE TABLE "EventInvitation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "userId" TEXT,
    "guestEmail" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "invitedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" DATETIME,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EventInvitation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EventInvitation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EventInvitation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "EventInvitation_eventId_idx" ON "EventInvitation"("eventId");
CREATE INDEX "EventInvitation_userId_idx" ON "EventInvitation"("userId");
CREATE INDEX "EventInvitation_status_idx" ON "EventInvitation"("status");
CREATE INDEX "EventInvitation_guestEmail_idx" ON "EventInvitation"("guestEmail");

CREATE TABLE "EventRegistrationQuestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "fieldType" TEXT NOT NULL DEFAULT 'text',
    "required" BOOLEAN NOT NULL DEFAULT 0,
    "optionsJson" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EventRegistrationQuestion_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "EventRegistrationQuestion_eventId_fieldKey_key" ON "EventRegistrationQuestion"("eventId", "fieldKey");
CREATE INDEX "EventRegistrationQuestion_eventId_idx" ON "EventRegistrationQuestion"("eventId");

CREATE TABLE "EventRegistrationAnswer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "registrationId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EventRegistrationAnswer_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "EventRegistration" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EventRegistrationAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "EventRegistrationQuestion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "EventRegistrationAnswer_registrationId_questionId_key" ON "EventRegistrationAnswer"("registrationId", "questionId");
CREATE INDEX "EventRegistrationAnswer_registrationId_idx" ON "EventRegistrationAnswer"("registrationId");

CREATE TABLE "EventRegistrationSequence" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "prefix" TEXT NOT NULL DEFAULT 'BME-EVT-',
    "nextValue" INTEGER NOT NULL DEFAULT 1
);
INSERT INTO "EventRegistrationSequence" ("id", "prefix", "nextValue") VALUES ('default', 'BME-EVT-', 1);

PRAGMA foreign_keys=ON;
