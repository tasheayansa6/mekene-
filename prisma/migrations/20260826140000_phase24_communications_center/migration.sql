-- Phase 24: Communication Center (templates, messaging, channel prefs, job extensions)

PRAGMA foreign_keys=OFF;

-- CommunicationTemplate first (referenced by CommunicationJob)
CREATE TABLE "CommunicationTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "variables" TEXT,
    "channels" TEXT NOT NULL DEFAULT 'in_app,email',
    "isActive" BOOLEAN NOT NULL DEFAULT 1,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CommunicationTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CommunicationTemplate_slug_key" ON "CommunicationTemplate"("slug");
CREATE INDEX "CommunicationTemplate_category_idx" ON "CommunicationTemplate"("category");
CREATE INDEX "CommunicationTemplate_isActive_idx" ON "CommunicationTemplate"("isActive");

-- Rebuild NotificationPreference with telegram/sms flags
CREATE TABLE "new_NotificationPreference" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "emailAnnouncements" BOOLEAN NOT NULL DEFAULT 1,
    "emailEvents" BOOLEAN NOT NULL DEFAULT 1,
    "emailMinistry" BOOLEAN NOT NULL DEFAULT 1,
    "emailMarketing" BOOLEAN NOT NULL DEFAULT 0,
    "inAppGeneral" BOOLEAN NOT NULL DEFAULT 1,
    "inAppEvents" BOOLEAN NOT NULL DEFAULT 1,
    "inAppMembership" BOOLEAN NOT NULL DEFAULT 1,
    "telegramEnabled" BOOLEAN NOT NULL DEFAULT 0,
    "smsEnabled" BOOLEAN NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_NotificationPreference" (
  "id", "userId", "emailAnnouncements", "emailEvents", "emailMinistry", "emailMarketing",
  "inAppGeneral", "inAppEvents", "inAppMembership", "telegramEnabled", "smsEnabled", "updatedAt", "createdAt"
)
SELECT
  "id", "userId", "emailAnnouncements", "emailEvents", "emailMinistry", "emailMarketing",
  "inAppGeneral", "inAppEvents", "inAppMembership", 0, 0, "updatedAt", "createdAt"
FROM "NotificationPreference";
DROP TABLE "NotificationPreference";
ALTER TABLE "new_NotificationPreference" RENAME TO "NotificationPreference";
CREATE UNIQUE INDEX "NotificationPreference_userId_key" ON "NotificationPreference"("userId");

-- Rebuild CommunicationJob with priority/template/recurrence
CREATE TABLE "new_CommunicationJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "audience" TEXT NOT NULL DEFAULT 'everyone',
    "ministryId" TEXT,
    "eventId" TEXT,
    "announcementId" TEXT,
    "payload" TEXT NOT NULL,
    "channels" TEXT NOT NULL DEFAULT 'in_app',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "templateId" TEXT,
    "recurrenceRule" TEXT,
    "recurrenceUntil" DATETIME,
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
    CONSTRAINT "CommunicationJob_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "CommunicationTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CommunicationJob_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_CommunicationJob" (
  "id", "type", "status", "audience", "ministryId", "eventId", "announcementId", "payload", "channels",
  "priority", "templateId", "recurrenceRule", "recurrenceUntil",
  "scheduledAt", "processedAt", "attemptCount", "maxAttempts", "nextRetryAt", "lastError",
  "idempotencyKey", "createdById", "createdAt", "updatedAt"
)
SELECT
  "id", "type", "status", "audience", "ministryId", "eventId", "announcementId", "payload", "channels",
  'normal', NULL, NULL, NULL,
  "scheduledAt", "processedAt", "attemptCount", "maxAttempts", "nextRetryAt", "lastError",
  "idempotencyKey", "createdById", "createdAt", "updatedAt"
FROM "CommunicationJob";
DROP TABLE "CommunicationJob";
ALTER TABLE "new_CommunicationJob" RENAME TO "CommunicationJob";
CREATE UNIQUE INDEX "CommunicationJob_idempotencyKey_key" ON "CommunicationJob"("idempotencyKey");
CREATE INDEX "CommunicationJob_status_idx" ON "CommunicationJob"("status");
CREATE INDEX "CommunicationJob_scheduledAt_idx" ON "CommunicationJob"("scheduledAt");
CREATE INDEX "CommunicationJob_nextRetryAt_idx" ON "CommunicationJob"("nextRetryAt");
CREATE INDEX "CommunicationJob_type_idx" ON "CommunicationJob"("type");
CREATE INDEX "CommunicationJob_createdById_idx" ON "CommunicationJob"("createdById");
CREATE INDEX "CommunicationJob_priority_idx" ON "CommunicationJob"("priority");
CREATE INDEX "CommunicationJob_templateId_idx" ON "CommunicationJob"("templateId");

-- Conversations / DMs
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL DEFAULT 'support',
    "subject" TEXT,
    "ministryId" TEXT,
    "eventId" TEXT,
    "archivedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE INDEX "Conversation_kind_idx" ON "Conversation"("kind");
CREATE INDEX "Conversation_ministryId_idx" ON "Conversation"("ministryId");
CREATE INDEX "Conversation_eventId_idx" ON "Conversation"("eventId");
CREATE INDEX "Conversation_updatedAt_idx" ON "Conversation"("updatedAt");

CREATE TABLE "ConversationParticipant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleLabel" TEXT,
    "lastReadAt" DATETIME,
    "archivedAt" DATETIME,
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ConversationParticipant_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ConversationParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ConversationParticipant_conversationId_userId_key" ON "ConversationParticipant"("conversationId", "userId");
CREATE INDEX "ConversationParticipant_userId_idx" ON "ConversationParticipant"("userId");
CREATE INDEX "ConversationParticipant_conversationId_idx" ON "ConversationParticipant"("conversationId");

CREATE TABLE "Message" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "attachmentUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "Message_conversationId_idx" ON "Message"("conversationId");
CREATE INDEX "Message_senderId_idx" ON "Message"("senderId");
CREATE INDEX "Message_createdAt_idx" ON "Message"("createdAt");

CREATE TABLE "MessageReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "messageId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "reviewedById" TEXT,
    "reviewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MessageReport_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MessageReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MessageReport_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "MessageReport_messageId_idx" ON "MessageReport"("messageId");
CREATE INDEX "MessageReport_reporterId_idx" ON "MessageReport"("reporterId");
CREATE INDEX "MessageReport_status_idx" ON "MessageReport"("status");

PRAGMA foreign_keys=ON;
