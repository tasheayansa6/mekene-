
-- Phase 27: Live streaming & virtual worship

CREATE TABLE "LiveSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "provider" TEXT NOT NULL DEFAULT 'youtube',
    "streamUrl" TEXT,
    "embedUrl" TEXT,
    "backupStreamUrl" TEXT,
    "backupEmbedUrl" TEXT,
    "providerVideoId" TEXT,
    "thumbnailUrl" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'public',
    "chatEnabled" BOOLEAN NOT NULL DEFAULT 1,
    "prayerEnabled" BOOLEAN NOT NULL DEFAULT 1,
    "attendanceEnabled" BOOLEAN NOT NULL DEFAULT 1,
    "reactionsEnabled" BOOLEAN NOT NULL DEFAULT 1,
    "pollsEnabled" BOOLEAN NOT NULL DEFAULT 0,
    "scheduledStartAt" DATETIME NOT NULL,
    "scheduledEndAt" DATETIME,
    "actualStartedAt" DATETIME,
    "actualEndedAt" DATETIME,
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Addis_Ababa',
    "peakViewers" INTEGER NOT NULL DEFAULT 0,
    "approximateViewers" INTEGER NOT NULL DEFAULT 0,
    "recordingSermonId" TEXT,
    "currentProgramItemId" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LiveSession_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LiveSession_recordingSermonId_fkey" FOREIGN KEY ("recordingSermonId") REFERENCES "Sermon" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "LiveSession_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "LiveSession_slug_key" ON "LiveSession"("slug");
CREATE INDEX "LiveSession_eventId_idx" ON "LiveSession"("eventId");
CREATE INDEX "LiveSession_status_idx" ON "LiveSession"("status");
CREATE INDEX "LiveSession_scheduledStartAt_idx" ON "LiveSession"("scheduledStartAt");
CREATE INDEX "LiveSession_visibility_idx" ON "LiveSession"("visibility");
CREATE INDEX "LiveSession_provider_idx" ON "LiveSession"("provider");
CREATE INDEX "LiveSession_createdAt_idx" ON "LiveSession"("createdAt");

CREATE TABLE "LiveProgramCursor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "liveSessionId" TEXT NOT NULL,
    "programItemId" TEXT NOT NULL,
    "label" TEXT,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "LiveProgramCursor_liveSessionId_fkey" FOREIGN KEY ("liveSessionId") REFERENCES "LiveSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "LiveProgramCursor_liveSessionId_idx" ON "LiveProgramCursor"("liveSessionId");
CREATE INDEX "LiveProgramCursor_programItemId_idx" ON "LiveProgramCursor"("programItemId");

CREATE TABLE "LiveChatMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "liveSessionId" TEXT NOT NULL,
    "userId" TEXT,
    "displayName" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'visible',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LiveChatMessage_liveSessionId_fkey" FOREIGN KEY ("liveSessionId") REFERENCES "LiveSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LiveChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "LiveChatMessage_liveSessionId_idx" ON "LiveChatMessage"("liveSessionId");
CREATE INDEX "LiveChatMessage_userId_idx" ON "LiveChatMessage"("userId");
CREATE INDEX "LiveChatMessage_status_idx" ON "LiveChatMessage"("status");
CREATE INDEX "LiveChatMessage_createdAt_idx" ON "LiveChatMessage"("createdAt");

CREATE TABLE "LiveChatModeration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "liveSessionId" TEXT NOT NULL,
    "messageId" TEXT,
    "action" TEXT NOT NULL,
    "reason" TEXT,
    "moderatorId" TEXT NOT NULL,
    "targetUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LiveChatModeration_liveSessionId_fkey" FOREIGN KEY ("liveSessionId") REFERENCES "LiveSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LiveChatModeration_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "LiveChatMessage" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "LiveChatModeration_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "LiveChatModeration_liveSessionId_idx" ON "LiveChatModeration"("liveSessionId");
CREATE INDEX "LiveChatModeration_moderatorId_idx" ON "LiveChatModeration"("moderatorId");
CREATE INDEX "LiveChatModeration_createdAt_idx" ON "LiveChatModeration"("createdAt");

CREATE TABLE "LivePrayerRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "liveSessionId" TEXT NOT NULL,
    "submitterId" TEXT,
    "name" TEXT,
    "body" TEXT NOT NULL,
    "isPrivate" BOOLEAN NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LivePrayerRequest_liveSessionId_fkey" FOREIGN KEY ("liveSessionId") REFERENCES "LiveSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LivePrayerRequest_submitterId_fkey" FOREIGN KEY ("submitterId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "LivePrayerRequest_liveSessionId_idx" ON "LivePrayerRequest"("liveSessionId");
CREATE INDEX "LivePrayerRequest_status_idx" ON "LivePrayerRequest"("status");
CREATE INDEX "LivePrayerRequest_isPrivate_idx" ON "LivePrayerRequest"("isPrivate");
CREATE INDEX "LivePrayerRequest_createdAt_idx" ON "LivePrayerRequest"("createdAt");

CREATE TABLE "LiveAttendance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "liveSessionId" TEXT NOT NULL,
    "userId" TEXT,
    "visitorKey" TEXT,
    "checkedInAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LiveAttendance_liveSessionId_fkey" FOREIGN KEY ("liveSessionId") REFERENCES "LiveSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LiveAttendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "LiveAttendance_liveSessionId_userId_key" ON "LiveAttendance"("liveSessionId", "userId");
CREATE UNIQUE INDEX "LiveAttendance_liveSessionId_visitorKey_key" ON "LiveAttendance"("liveSessionId", "visitorKey");
CREATE INDEX "LiveAttendance_liveSessionId_idx" ON "LiveAttendance"("liveSessionId");
CREATE INDEX "LiveAttendance_userId_idx" ON "LiveAttendance"("userId");
CREATE INDEX "LiveAttendance_checkedInAt_idx" ON "LiveAttendance"("checkedInAt");

CREATE TABLE "LiveReaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "liveSessionId" TEXT NOT NULL,
    "userId" TEXT,
    "visitorKey" TEXT,
    "emoji" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LiveReaction_liveSessionId_fkey" FOREIGN KEY ("liveSessionId") REFERENCES "LiveSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LiveReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "LiveReaction_liveSessionId_idx" ON "LiveReaction"("liveSessionId");
CREATE INDEX "LiveReaction_createdAt_idx" ON "LiveReaction"("createdAt");
CREATE INDEX "LiveReaction_emoji_idx" ON "LiveReaction"("emoji");

CREATE TABLE "LivePoll" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "liveSessionId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT 0,
    "closedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LivePoll_liveSessionId_fkey" FOREIGN KEY ("liveSessionId") REFERENCES "LiveSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "LivePoll_liveSessionId_idx" ON "LivePoll"("liveSessionId");
CREATE INDEX "LivePoll_isActive_idx" ON "LivePoll"("isActive");

CREATE TABLE "LivePollOption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pollId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "LivePollOption_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "LivePoll" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "LivePollOption_pollId_idx" ON "LivePollOption"("pollId");

CREATE TABLE "LivePollResponse" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pollId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "userId" TEXT,
    "visitorKey" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LivePollResponse_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "LivePoll" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LivePollResponse_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "LivePollOption" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LivePollResponse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "LivePollResponse_pollId_userId_key" ON "LivePollResponse"("pollId", "userId");
CREATE UNIQUE INDEX "LivePollResponse_pollId_visitorKey_key" ON "LivePollResponse"("pollId", "visitorKey");
CREATE INDEX "LivePollResponse_pollId_idx" ON "LivePollResponse"("pollId");
CREATE INDEX "LivePollResponse_optionId_idx" ON "LivePollResponse"("optionId");

CREATE TABLE "LiveAnnouncement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "liveSessionId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isPinned" BOOLEAN NOT NULL DEFAULT 0,
    "authorId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME,
    CONSTRAINT "LiveAnnouncement_liveSessionId_fkey" FOREIGN KEY ("liveSessionId") REFERENCES "LiveSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LiveAnnouncement_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "LiveAnnouncement_liveSessionId_idx" ON "LiveAnnouncement"("liveSessionId");
CREATE INDEX "LiveAnnouncement_isPinned_idx" ON "LiveAnnouncement"("isPinned");
CREATE INDEX "LiveAnnouncement_createdAt_idx" ON "LiveAnnouncement"("createdAt");
