-- Phase 14: Church Attendance & Check-in
-- Replaces the foundation Attendance stub with sessions, records, QR tokens, and corrections.

PRAGMA foreign_keys=OFF;

DROP TABLE IF EXISTS "Attendance";

CREATE TABLE "AttendanceSeries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "sessionType" TEXT NOT NULL DEFAULT 'sunday_service',
    "ministryId" TEXT,
    "locationId" TEXT,
    "locationNote" TEXT,
    "recurrence" TEXT NOT NULL DEFAULT 'weekly',
    "dayOfWeek" INTEGER,
    "startTimeLocal" TEXT NOT NULL,
    "endTimeLocal" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Addis_Ababa',
    "isActive" BOOLEAN NOT NULL DEFAULT 1,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AttendanceSeries_ministryId_fkey" FOREIGN KEY ("ministryId") REFERENCES "Ministry" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AttendanceSeries_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "EventLocation" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AttendanceSeries_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "AttendanceSeries_ministryId_idx" ON "AttendanceSeries"("ministryId");
CREATE INDEX "AttendanceSeries_isActive_idx" ON "AttendanceSeries"("isActive");
CREATE INDEX "AttendanceSeries_sessionType_idx" ON "AttendanceSeries"("sessionType");

CREATE TABLE "AttendanceSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "sessionType" TEXT NOT NULL DEFAULT 'sunday_service',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "startsAt" DATETIME NOT NULL,
    "endsAt" DATETIME,
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Addis_Ababa',
    "locationNote" TEXT,
    "notes" TEXT,
    "eventId" TEXT,
    "ministryId" TEXT,
    "locationId" TEXT,
    "seriesId" TEXT,
    "allowSelfCheckIn" BOOLEAN NOT NULL DEFAULT 1,
    "allowQrCheckIn" BOOLEAN NOT NULL DEFAULT 1,
    "openedAt" DATETIME,
    "closedAt" DATETIME,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AttendanceSession_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AttendanceSession_ministryId_fkey" FOREIGN KEY ("ministryId") REFERENCES "Ministry" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AttendanceSession_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "EventLocation" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AttendanceSession_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "AttendanceSeries" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AttendanceSession_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "AttendanceSession_status_idx" ON "AttendanceSession"("status");
CREATE INDEX "AttendanceSession_startsAt_idx" ON "AttendanceSession"("startsAt");
CREATE INDEX "AttendanceSession_sessionType_idx" ON "AttendanceSession"("sessionType");
CREATE INDEX "AttendanceSession_eventId_idx" ON "AttendanceSession"("eventId");
CREATE INDEX "AttendanceSession_ministryId_idx" ON "AttendanceSession"("ministryId");
CREATE INDEX "AttendanceSession_seriesId_idx" ON "AttendanceSession"("seriesId");
CREATE INDEX "AttendanceSession_createdById_idx" ON "AttendanceSession"("createdById");

CREATE TABLE "AttendanceRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'present',
    "method" TEXT NOT NULL DEFAULT 'manual',
    "checkInAt" DATETIME,
    "checkOutAt" DATETIME,
    "recordedById" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AttendanceRecord_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AttendanceSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AttendanceRecord_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AttendanceRecord_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "AttendanceRecord_sessionId_memberId_key" ON "AttendanceRecord"("sessionId", "memberId");
CREATE INDEX "AttendanceRecord_memberId_idx" ON "AttendanceRecord"("memberId");
CREATE INDEX "AttendanceRecord_status_idx" ON "AttendanceRecord"("status");
CREATE INDEX "AttendanceRecord_checkInAt_idx" ON "AttendanceRecord"("checkInAt");
CREATE INDEX "AttendanceRecord_recordedById_idx" ON "AttendanceRecord"("recordedById");

CREATE TABLE "AttendanceCorrection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recordId" TEXT NOT NULL,
    "oldValue" TEXT NOT NULL,
    "newValue" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "changedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AttendanceCorrection_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "AttendanceRecord" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AttendanceCorrection_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "AttendanceCorrection_recordId_idx" ON "AttendanceCorrection"("recordId");
CREATE INDEX "AttendanceCorrection_changedById_idx" ON "AttendanceCorrection"("changedById");
CREATE INDEX "AttendanceCorrection_createdAt_idx" ON "AttendanceCorrection"("createdAt");

CREATE TABLE "AttendanceQrToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "revokedAt" DATETIME,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AttendanceQrToken_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AttendanceSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AttendanceQrToken_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "AttendanceQrToken_tokenHash_key" ON "AttendanceQrToken"("tokenHash");
CREATE INDEX "AttendanceQrToken_sessionId_idx" ON "AttendanceQrToken"("sessionId");
CREATE INDEX "AttendanceQrToken_expiresAt_idx" ON "AttendanceQrToken"("expiresAt");

PRAGMA foreign_keys=ON;
