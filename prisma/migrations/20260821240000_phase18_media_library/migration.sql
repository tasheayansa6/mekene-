-- Phase 18: Sermons, Bible Study & Digital Media Library extensions

PRAGMA foreign_keys=OFF;

-- Leader slug
CREATE TABLE "new_Leader" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "slug" TEXT,
    "title" TEXT,
    "bio" TEXT,
    "photoUrl" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "isActive" BOOLEAN NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "positionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Leader_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "LeadershipPosition" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Leader" ("id", "firstName", "lastName", "slug", "title", "bio", "photoUrl", "email", "phone", "status", "isActive", "sortOrder", "positionId", "createdAt", "updatedAt")
SELECT "id", "firstName", "lastName", NULL, "title", "bio", "photoUrl", "email", "phone", "status", "isActive", "sortOrder", "positionId", "createdAt", "updatedAt" FROM "Leader";
DROP TABLE "Leader";
ALTER TABLE "new_Leader" RENAME TO "Leader";
CREATE UNIQUE INDEX "Leader_slug_key" ON "Leader"("slug");
CREATE INDEX "Leader_status_idx" ON "Leader"("status");
CREATE INDEX "Leader_isActive_idx" ON "Leader"("isActive");
CREATE INDEX "Leader_positionId_idx" ON "Leader"("positionId");
CREATE INDEX "Leader_sortOrder_idx" ON "Leader"("sortOrder");

CREATE TABLE "new_Sermon" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "notes" TEXT,
    "transcript" TEXT,
    "contentType" TEXT NOT NULL DEFAULT 'sermon',
    "accessLevel" TEXT NOT NULL DEFAULT 'public',
    "speakerName" TEXT,
    "speakerId" TEXT,
    "seriesId" TEXT,
    "categoryId" TEXT,
    "sermonDate" DATETIME NOT NULL,
    "durationSeconds" INTEGER,
    "thumbnailUrl" TEXT,
    "thumbnailAlt" TEXT,
    "audioUrl" TEXT,
    "audioFileName" TEXT,
    "audioMime" TEXT,
    "audioSize" INTEGER,
    "videoUrl" TEXT,
    "notesFileUrl" TEXT,
    "notesFileName" TEXT,
    "notesFileMime" TEXT,
    "notesFileSize" INTEGER,
    "copyrightHolder" TEXT,
    "license" TEXT,
    "sourceAttribution" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "isFeatured" BOOLEAN NOT NULL DEFAULT 0,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "ogImageUrl" TEXT,
    "authorId" TEXT NOT NULL,
    "publishedAt" DATETIME,
    "publishAt" DATETIME,
    "audioDownloads" INTEGER NOT NULL DEFAULT 0,
    "notesDownloads" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Sermon_speakerId_fkey" FOREIGN KEY ("speakerId") REFERENCES "Leader" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Sermon_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "SermonSeries" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Sermon_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "SermonCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Sermon_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Sermon" (
  "id", "title", "slug", "description", "notes", "transcript", "contentType", "accessLevel",
  "speakerName", "speakerId", "seriesId", "categoryId", "sermonDate", "durationSeconds",
  "thumbnailUrl", "thumbnailAlt", "audioUrl", "audioFileName", "audioMime", "audioSize",
  "videoUrl", "notesFileUrl", "notesFileName", "notesFileMime", "notesFileSize",
  "copyrightHolder", "license", "sourceAttribution", "status", "isFeatured",
  "seoTitle", "seoDescription", "ogImageUrl", "authorId", "publishedAt", "publishAt",
  "audioDownloads", "notesDownloads", "createdAt", "updatedAt"
)
SELECT
  "id", "title", "slug", "description", "notes", "transcript", 'sermon', 'public',
  "speakerName", "speakerId", "seriesId", "categoryId", "sermonDate", NULL,
  "thumbnailUrl", "thumbnailAlt", "audioUrl", "audioFileName", "audioMime", "audioSize",
  "videoUrl", "notesFileUrl", "notesFileName", "notesFileMime", "notesFileSize",
  NULL, NULL, NULL, "status", "isFeatured",
  "seoTitle", "seoDescription", "ogImageUrl", "authorId", "publishedAt", "publishAt",
  "audioDownloads", "notesDownloads", "createdAt", "updatedAt"
FROM "Sermon";
DROP TABLE "Sermon";
ALTER TABLE "new_Sermon" RENAME TO "Sermon";
CREATE UNIQUE INDEX "Sermon_slug_key" ON "Sermon"("slug");
CREATE INDEX "Sermon_status_idx" ON "Sermon"("status");
CREATE INDEX "Sermon_slug_idx" ON "Sermon"("slug");
CREATE INDEX "Sermon_sermonDate_idx" ON "Sermon"("sermonDate");
CREATE INDEX "Sermon_speakerId_idx" ON "Sermon"("speakerId");
CREATE INDEX "Sermon_seriesId_idx" ON "Sermon"("seriesId");
CREATE INDEX "Sermon_categoryId_idx" ON "Sermon"("categoryId");
CREATE INDEX "Sermon_isFeatured_idx" ON "Sermon"("isFeatured");
CREATE INDEX "Sermon_authorId_idx" ON "Sermon"("authorId");
CREATE INDEX "Sermon_contentType_idx" ON "Sermon"("contentType");
CREATE INDEX "Sermon_accessLevel_idx" ON "Sermon"("accessLevel");
CREATE INDEX "Sermon_publishedAt_idx" ON "Sermon"("publishedAt");

CREATE TABLE "new_Resource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "content" TEXT,
    "fileUrl" TEXT,
    "fileName" TEXT,
    "fileMime" TEXT,
    "fileSize" INTEGER,
    "thumbnailUrl" TEXT,
    "thumbnailAlt" TEXT,
    "externalUrl" TEXT,
    "accessLevel" TEXT NOT NULL DEFAULT 'public',
    "copyrightHolder" TEXT,
    "license" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "isFeatured" BOOLEAN NOT NULL DEFAULT 0,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "categoryId" TEXT,
    "authorId" TEXT NOT NULL,
    "publishedAt" DATETIME,
    "publishAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Resource_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ContentCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Resource_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Resource" (
  "id", "title", "slug", "description", "content", "fileUrl", "fileName", "fileMime", "fileSize",
  "thumbnailUrl", "thumbnailAlt", "externalUrl", "accessLevel", "copyrightHolder", "license", "version",
  "status", "isFeatured", "downloadCount", "seoTitle", "seoDescription", "categoryId", "authorId",
  "publishedAt", "publishAt", "createdAt", "updatedAt"
)
SELECT
  "id", "title", "slug", "description", "content", "fileUrl", "fileName", "fileMime", "fileSize",
  "thumbnailUrl", "thumbnailAlt", "externalUrl", 'public', NULL, NULL, 1,
  "status", "isFeatured", "downloadCount", "seoTitle", "seoDescription", "categoryId", "authorId",
  "publishedAt", "publishAt", "createdAt", "updatedAt"
FROM "Resource";
DROP TABLE "Resource";
ALTER TABLE "new_Resource" RENAME TO "Resource";
CREATE UNIQUE INDEX "Resource_slug_key" ON "Resource"("slug");
CREATE INDEX "Resource_status_idx" ON "Resource"("status");
CREATE INDEX "Resource_slug_idx" ON "Resource"("slug");
CREATE INDEX "Resource_categoryId_idx" ON "Resource"("categoryId");
CREATE INDEX "Resource_authorId_idx" ON "Resource"("authorId");
CREATE INDEX "Resource_isFeatured_idx" ON "Resource"("isFeatured");
CREATE INDEX "Resource_accessLevel_idx" ON "Resource"("accessLevel");

CREATE TABLE "SermonBookmark" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "sermonId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SermonBookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SermonBookmark_sermonId_fkey" FOREIGN KEY ("sermonId") REFERENCES "Sermon" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "SermonBookmark_userId_sermonId_key" ON "SermonBookmark"("userId", "sermonId");
CREATE INDEX "SermonBookmark_userId_idx" ON "SermonBookmark"("userId");
CREATE INDEX "SermonBookmark_sermonId_idx" ON "SermonBookmark"("sermonId");
CREATE INDEX "SermonBookmark_createdAt_idx" ON "SermonBookmark"("createdAt");

CREATE TABLE "MediaPlaylist" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT 0,
    "ownerId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MediaPlaylist_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "MediaPlaylist_slug_key" ON "MediaPlaylist"("slug");
CREATE INDEX "MediaPlaylist_ownerId_idx" ON "MediaPlaylist"("ownerId");
CREATE INDEX "MediaPlaylist_isPublic_idx" ON "MediaPlaylist"("isPublic");

CREATE TABLE "MediaPlaylistItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playlistId" TEXT NOT NULL,
    "sermonId" TEXT,
    "seriesId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MediaPlaylistItem_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "MediaPlaylist" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MediaPlaylistItem_sermonId_fkey" FOREIGN KEY ("sermonId") REFERENCES "Sermon" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MediaPlaylistItem_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "SermonSeries" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "MediaPlaylistItem_playlistId_idx" ON "MediaPlaylistItem"("playlistId");
CREATE INDEX "MediaPlaylistItem_sermonId_idx" ON "MediaPlaylistItem"("sermonId");
CREATE INDEX "MediaPlaylistItem_seriesId_idx" ON "MediaPlaylistItem"("seriesId");
CREATE INDEX "MediaPlaylistItem_sortOrder_idx" ON "MediaPlaylistItem"("sortOrder");

CREATE TABLE "MediaProcessingJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "targetKind" TEXT NOT NULL,
    "targetId" TEXT,
    "payload" TEXT,
    "lastError" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "createdById" TEXT,
    "processedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MediaProcessingJob_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "MediaProcessingJob_status_idx" ON "MediaProcessingJob"("status");
CREATE INDEX "MediaProcessingJob_type_idx" ON "MediaProcessingJob"("type");
CREATE INDEX "MediaProcessingJob_createdAt_idx" ON "MediaProcessingJob"("createdAt");

PRAGMA foreign_keys=ON;
