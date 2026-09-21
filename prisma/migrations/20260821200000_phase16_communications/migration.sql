-- Phase 16: Church Communication & Notification System

PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Announcement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "audience" TEXT NOT NULL DEFAULT 'everyone',
    "ministryId" TEXT,
    "eventId" TEXT,
    "publishToTelegram" BOOLEAN NOT NULL DEFAULT 0,
    "publishToSocial" BOOLEAN NOT NULL DEFAULT 0,
    "startAt" DATETIME NOT NULL,
    "endAt" DATETIME,
    "isFeatured" BOOLEAN NOT NULL DEFAULT 0,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "featuredImageUrl" TEXT,
    "featuredImageAlt" TEXT,
    "authorId" TEXT NOT NULL,
    "publishedAt" DATETIME,
    "publishAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Announcement_ministryId_fkey" FOREIGN KEY ("ministryId") REFERENCES "Ministry" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Announcement_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Announcement_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_Announcement" (
  "id", "title", "slug", "excerpt", "content", "category", "priority", "status",
  "audience", "ministryId", "eventId", "publishToTelegram", "publishToSocial",
  "startAt", "endAt", "isFeatured", "seoTitle", "seoDescription",
  "featuredImageUrl", "featuredImageAlt", "authorId", "publishedAt", "publishAt",
  "createdAt", "updatedAt"
)
SELECT
  "id", "title", "slug", "excerpt", "content", 'general', "priority", "status",
  'everyone', NULL, NULL, 0, 0,
  "startAt", "endAt", "isFeatured", "seoTitle", "seoDescription",
  "featuredImageUrl", "featuredImageAlt", "authorId", "publishedAt", "publishAt",
  "createdAt", "updatedAt"
FROM "Announcement";

DROP TABLE "Announcement";
ALTER TABLE "new_Announcement" RENAME TO "Announcement";

CREATE UNIQUE INDEX "Announcement_slug_key" ON "Announcement"("slug");
CREATE INDEX "Announcement_status_idx" ON "Announcement"("status");
CREATE INDEX "Announcement_startAt_idx" ON "Announcement"("startAt");
CREATE INDEX "Announcement_endAt_idx" ON "Announcement"("endAt");
CREATE INDEX "Announcement_isFeatured_idx" ON "Announcement"("isFeatured");
CREATE INDEX "Announcement_authorId_idx" ON "Announcement"("authorId");
CREATE INDEX "Announcement_category_idx" ON "Announcement"("category");
CREATE INDEX "Announcement_audience_idx" ON "Announcement"("audience");
CREATE INDEX "Announcement_ministryId_idx" ON "Announcement"("ministryId");
CREATE INDEX "Announcement_eventId_idx" ON "Announcement"("eventId");
CREATE INDEX "Announcement_publishAt_idx" ON "Announcement"("publishAt");

CREATE TABLE "AppNotification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'system',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" TEXT,
    "relatedUrl" TEXT,
    "readAt" DATETIME,
    "expiresAt" DATETIME,
    "idempotencyKey" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AppNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "AppNotification_idempotencyKey_key" ON "AppNotification"("idempotencyKey");
CREATE INDEX "AppNotification_userId_idx" ON "AppNotification"("userId");
CREATE INDEX "AppNotification_readAt_idx" ON "AppNotification"("readAt");
CREATE INDEX "AppNotification_createdAt_idx" ON "AppNotification"("createdAt");
CREATE INDEX "AppNotification_type_idx" ON "AppNotification"("type");
CREATE INDEX "AppNotification_expiresAt_idx" ON "AppNotification"("expiresAt");

CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "emailAnnouncements" BOOLEAN NOT NULL DEFAULT 1,
    "emailEvents" BOOLEAN NOT NULL DEFAULT 1,
    "emailMinistry" BOOLEAN NOT NULL DEFAULT 1,
    "emailMarketing" BOOLEAN NOT NULL DEFAULT 0,
    "inAppGeneral" BOOLEAN NOT NULL DEFAULT 1,
    "inAppEvents" BOOLEAN NOT NULL DEFAULT 1,
    "inAppMembership" BOOLEAN NOT NULL DEFAULT 1,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "NotificationPreference_userId_key" ON "NotificationPreference"("userId");

CREATE TABLE "CommunicationJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "audience" TEXT NOT NULL DEFAULT 'everyone',
    "ministryId" TEXT,
    "eventId" TEXT,
    "announcementId" TEXT,
    "payload" TEXT NOT NULL,
    "channels" TEXT NOT NULL DEFAULT 'in_app',
    "scheduledAt" DATETIME,
    "processedAt" DATETIME,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "nextRetryAt" DATETIME,
    "lastError" TEXT,
    "idempotencyKey" TEXT,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CommunicationJob_ministryId_fkey" FOREIGN KEY ("ministryId") REFERENCES "Ministry" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CommunicationJob_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CommunicationJob_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CommunicationJob_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CommunicationJob_idempotencyKey_key" ON "CommunicationJob"("idempotencyKey");
CREATE INDEX "CommunicationJob_status_idx" ON "CommunicationJob"("status");
CREATE INDEX "CommunicationJob_scheduledAt_idx" ON "CommunicationJob"("scheduledAt");
CREATE INDEX "CommunicationJob_nextRetryAt_idx" ON "CommunicationJob"("nextRetryAt");
CREATE INDEX "CommunicationJob_type_idx" ON "CommunicationJob"("type");
CREATE INDEX "CommunicationJob_createdById_idx" ON "CommunicationJob"("createdById");

CREATE TABLE "NotificationDelivery" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "notificationId" TEXT,
    "jobId" TEXT,
    "userId" TEXT,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "providerReference" TEXT,
    "errorCode" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "sentAt" DATETIME,
    "deliveredAt" DATETIME,
    "failedAt" DATETIME,
    "idempotencyKey" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "NotificationDelivery_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "AppNotification" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "NotificationDelivery_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "CommunicationJob" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "NotificationDelivery_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "NotificationDelivery_idempotencyKey_key" ON "NotificationDelivery"("idempotencyKey");
CREATE INDEX "NotificationDelivery_notificationId_idx" ON "NotificationDelivery"("notificationId");
CREATE INDEX "NotificationDelivery_jobId_idx" ON "NotificationDelivery"("jobId");
CREATE INDEX "NotificationDelivery_userId_idx" ON "NotificationDelivery"("userId");
CREATE INDEX "NotificationDelivery_channel_idx" ON "NotificationDelivery"("channel");
CREATE INDEX "NotificationDelivery_status_idx" ON "NotificationDelivery"("status");
CREATE INDEX "NotificationDelivery_createdAt_idx" ON "NotificationDelivery"("createdAt");

PRAGMA foreign_keys=ON;
