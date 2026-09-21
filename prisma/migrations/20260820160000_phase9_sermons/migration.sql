-- Phase 9 sermons: replace stub Sermon and add series, categories, scripture

PRAGMA foreign_keys=OFF;

DROP TABLE IF EXISTS "Sermon";

CREATE TABLE "SermonCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "SermonCategory_slug_key" ON "SermonCategory"("slug");
CREATE INDEX "SermonCategory_sortOrder_idx" ON "SermonCategory"("sortOrder");

CREATE TABLE "SermonSeries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "imageAlt" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "publishedAt" DATETIME,
    "publishAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "SermonSeries_slug_key" ON "SermonSeries"("slug");
CREATE INDEX "SermonSeries_status_idx" ON "SermonSeries"("status");
CREATE INDEX "SermonSeries_slug_idx" ON "SermonSeries"("slug");

CREATE TABLE "Sermon" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "notes" TEXT,
    "transcript" TEXT,
    "speakerName" TEXT,
    "speakerId" TEXT,
    "seriesId" TEXT,
    "categoryId" TEXT,
    "sermonDate" DATETIME NOT NULL,
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
    "status" TEXT NOT NULL DEFAULT 'draft',
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
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
CREATE UNIQUE INDEX "Sermon_slug_key" ON "Sermon"("slug");
CREATE INDEX "Sermon_status_idx" ON "Sermon"("status");
CREATE INDEX "Sermon_slug_idx" ON "Sermon"("slug");
CREATE INDEX "Sermon_sermonDate_idx" ON "Sermon"("sermonDate");
CREATE INDEX "Sermon_speakerId_idx" ON "Sermon"("speakerId");
CREATE INDEX "Sermon_seriesId_idx" ON "Sermon"("seriesId");
CREATE INDEX "Sermon_categoryId_idx" ON "Sermon"("categoryId");
CREATE INDEX "Sermon_isFeatured_idx" ON "Sermon"("isFeatured");
CREATE INDEX "Sermon_authorId_idx" ON "Sermon"("authorId");

CREATE TABLE "SermonScripture" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sermonId" TEXT NOT NULL,
    "book" TEXT NOT NULL,
    "chapter" INTEGER,
    "verseStart" INTEGER,
    "verseEnd" INTEGER,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "SermonScripture_sermonId_fkey" FOREIGN KEY ("sermonId") REFERENCES "Sermon" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "SermonScripture_sermonId_idx" ON "SermonScripture"("sermonId");
CREATE INDEX "SermonScripture_book_idx" ON "SermonScripture"("book");

PRAGMA foreign_keys=ON;
