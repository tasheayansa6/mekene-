-- Phase 26: Digital Library extensions

PRAGMA foreign_keys=OFF;

-- Rebuild Sermon with library fields
CREATE TABLE "new_Sermon" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "notes" TEXT,
    "transcript" TEXT,
    "transcriptStatus" TEXT NOT NULL DEFAULT 'draft',
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
    "audioContentHash" TEXT,
    "videoUrl" TEXT,
    "notesFileUrl" TEXT,
    "notesFileName" TEXT,
    "notesFileMime" TEXT,
    "notesFileSize" INTEGER,
    "allowDownload" BOOLEAN NOT NULL DEFAULT 1,
    "allowPodcast" BOOLEAN NOT NULL DEFAULT 1,
    "copyrightHolder" TEXT,
    "license" TEXT,
    "sourceAttribution" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "isFeatured" BOOLEAN NOT NULL DEFAULT 0,
    "playCount" INTEGER NOT NULL DEFAULT 0,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
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
  "id","title","slug","description","notes","transcript","transcriptStatus","contentType","accessLevel",
  "speakerName","speakerId","seriesId","categoryId","sermonDate","durationSeconds","thumbnailUrl","thumbnailAlt",
  "audioUrl","audioFileName","audioMime","audioSize","audioContentHash","videoUrl",
  "notesFileUrl","notesFileName","notesFileMime","notesFileSize","allowDownload","allowPodcast",
  "copyrightHolder","license","sourceAttribution","status","isFeatured","playCount","viewCount",
  "seoTitle","seoDescription","ogImageUrl","authorId","publishedAt","publishAt","audioDownloads","notesDownloads",
  "createdAt","updatedAt"
)
SELECT
  "id","title","slug","description","notes","transcript",
  CASE WHEN "transcript" IS NOT NULL AND length("transcript") > 0 THEN 'published' ELSE 'draft' END,
  "contentType","accessLevel",
  "speakerName","speakerId","seriesId","categoryId","sermonDate","durationSeconds","thumbnailUrl","thumbnailAlt",
  "audioUrl","audioFileName","audioMime","audioSize",NULL,"videoUrl",
  "notesFileUrl","notesFileName","notesFileMime","notesFileSize",1,1,
  "copyrightHolder","license","sourceAttribution","status","isFeatured",0,0,
  "seoTitle","seoDescription","ogImageUrl","authorId","publishedAt","publishAt","audioDownloads","notesDownloads",
  "createdAt","updatedAt"
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
CREATE INDEX "Sermon_playCount_idx" ON "Sermon"("playCount");
CREATE INDEX "Sermon_transcriptStatus_idx" ON "Sermon"("transcriptStatus");
CREATE INDEX "Sermon_audioContentHash_idx" ON "Sermon"("audioContentHash");

-- Rebuild MediaPlaylist
CREATE TABLE "new_MediaPlaylist" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "coverImageUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "isPublic" BOOLEAN NOT NULL DEFAULT 0,
    "isFeatured" BOOLEAN NOT NULL DEFAULT 0,
    "ownerId" TEXT,
    "publishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MediaPlaylist_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_MediaPlaylist" (
  "id","title","slug","description","coverImageUrl","status","isPublic","isFeatured","ownerId","publishedAt","createdAt","updatedAt"
)
SELECT "id","title","slug","description",NULL,
  CASE WHEN "isPublic" = 1 THEN 'published' ELSE 'draft' END,
  "isPublic",0,"ownerId",
  CASE WHEN "isPublic" = 1 THEN "createdAt" ELSE NULL END,
  "createdAt","updatedAt"
FROM "MediaPlaylist";
DROP TABLE "MediaPlaylist";
ALTER TABLE "new_MediaPlaylist" RENAME TO "MediaPlaylist";
CREATE UNIQUE INDEX "MediaPlaylist_slug_key" ON "MediaPlaylist"("slug");
CREATE INDEX "MediaPlaylist_ownerId_idx" ON "MediaPlaylist"("ownerId");
CREATE INDEX "MediaPlaylist_isPublic_idx" ON "MediaPlaylist"("isPublic");
CREATE INDEX "MediaPlaylist_status_idx" ON "MediaPlaylist"("status");
CREATE INDEX "MediaPlaylist_isFeatured_idx" ON "MediaPlaylist"("isFeatured");

-- Rebuild MediaProcessingJob with idempotencyKey
CREATE TABLE "new_MediaProcessingJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "targetKind" TEXT NOT NULL,
    "targetId" TEXT,
    "payload" TEXT,
    "lastError" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "idempotencyKey" TEXT,
    "createdById" TEXT,
    "processedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MediaProcessingJob_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_MediaProcessingJob" (
  "id","type","status","targetKind","targetId","payload","lastError","attemptCount","maxAttempts",
  "idempotencyKey","createdById","processedAt","createdAt","updatedAt"
)
SELECT "id","type","status","targetKind","targetId","payload","lastError","attemptCount","maxAttempts",
  NULL,"createdById","processedAt","createdAt","updatedAt"
FROM "MediaProcessingJob";
DROP TABLE "MediaProcessingJob";
ALTER TABLE "new_MediaProcessingJob" RENAME TO "MediaProcessingJob";
CREATE UNIQUE INDEX "MediaProcessingJob_idempotencyKey_key" ON "MediaProcessingJob"("idempotencyKey");
CREATE INDEX "MediaProcessingJob_status_idx" ON "MediaProcessingJob"("status");
CREATE INDEX "MediaProcessingJob_type_idx" ON "MediaProcessingJob"("type");
CREATE INDEX "MediaProcessingJob_createdAt_idx" ON "MediaProcessingJob"("createdAt");

CREATE TABLE "MediaPlaybackProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "sermonId" TEXT NOT NULL,
    "positionSeconds" REAL NOT NULL DEFAULT 0,
    "durationSeconds" REAL,
    "completedAt" DATETIME,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MediaPlaybackProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MediaPlaybackProgress_sermonId_fkey" FOREIGN KEY ("sermonId") REFERENCES "Sermon" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "MediaPlaybackProgress_userId_sermonId_key" ON "MediaPlaybackProgress"("userId", "sermonId");
CREATE INDEX "MediaPlaybackProgress_userId_idx" ON "MediaPlaybackProgress"("userId");
CREATE INDEX "MediaPlaybackProgress_sermonId_idx" ON "MediaPlaybackProgress"("sermonId");
CREATE INDEX "MediaPlaybackProgress_updatedAt_idx" ON "MediaPlaybackProgress"("updatedAt");

CREATE TABLE "MediaSubtitle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sermonId" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "format" TEXT NOT NULL DEFAULT 'vtt',
    "fileUrl" TEXT NOT NULL,
    "label" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT 0,
    "uploadedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MediaSubtitle_sermonId_fkey" FOREIGN KEY ("sermonId") REFERENCES "Sermon" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MediaSubtitle_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "MediaSubtitle_sermonId_language_format_key" ON "MediaSubtitle"("sermonId", "language", "format");
CREATE INDEX "MediaSubtitle_sermonId_idx" ON "MediaSubtitle"("sermonId");
CREATE INDEX "MediaSubtitle_language_idx" ON "MediaSubtitle"("language");

CREATE TABLE "MediaContentReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sermonId" TEXT NOT NULL,
    "reporterId" TEXT,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "reviewedById" TEXT,
    "reviewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MediaContentReport_sermonId_fkey" FOREIGN KEY ("sermonId") REFERENCES "Sermon" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MediaContentReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MediaContentReport_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "MediaContentReport_sermonId_idx" ON "MediaContentReport"("sermonId");
CREATE INDEX "MediaContentReport_status_idx" ON "MediaContentReport"("status");
CREATE INDEX "MediaContentReport_createdAt_idx" ON "MediaContentReport"("createdAt");

PRAGMA foreign_keys=ON;
