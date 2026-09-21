-- Phase 12 gallery: replace stub GalleryAlbum/GalleryImage with albums, categories, and media items

PRAGMA foreign_keys=OFF;

DROP TABLE IF EXISTS "GalleryImage";
DROP TABLE IF EXISTS "GalleryAlbum";

CREATE TABLE "GalleryCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "GalleryCategory_slug_key" ON "GalleryCategory"("slug");
CREATE INDEX "GalleryCategory_sortOrder_idx" ON "GalleryCategory"("sortOrder");

CREATE TABLE "GalleryAlbum" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "coverImageUrl" TEXT,
    "coverImageAlt" TEXT,
    "categoryId" TEXT,
    "eventId" TEXT,
    "ministryId" TEXT,
    "albumDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "isFeatured" INTEGER NOT NULL DEFAULT 0,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "authorId" TEXT NOT NULL,
    "publishedAt" DATETIME,
    "publishAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GalleryAlbum_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "GalleryCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "GalleryAlbum_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "GalleryAlbum_ministryId_fkey" FOREIGN KEY ("ministryId") REFERENCES "Ministry" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "GalleryAlbum_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "GalleryAlbum_slug_key" ON "GalleryAlbum"("slug");
CREATE INDEX "GalleryAlbum_status_idx" ON "GalleryAlbum"("status");
CREATE INDEX "GalleryAlbum_slug_idx" ON "GalleryAlbum"("slug");
CREATE INDEX "GalleryAlbum_categoryId_idx" ON "GalleryAlbum"("categoryId");
CREATE INDEX "GalleryAlbum_eventId_idx" ON "GalleryAlbum"("eventId");
CREATE INDEX "GalleryAlbum_ministryId_idx" ON "GalleryAlbum"("ministryId");
CREATE INDEX "GalleryAlbum_isFeatured_idx" ON "GalleryAlbum"("isFeatured");
CREATE INDEX "GalleryAlbum_albumDate_idx" ON "GalleryAlbum"("albumDate");
CREATE INDEX "GalleryAlbum_authorId_idx" ON "GalleryAlbum"("authorId");

CREATE TABLE "GalleryMediaItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "mediaType" TEXT NOT NULL,
    "fileUrl" TEXT,
    "thumbnailUrl" TEXT,
    "externalUrl" TEXT,
    "albumId" TEXT NOT NULL,
    "eventId" TEXT,
    "ministryId" TEXT,
    "sermonId" TEXT,
    "caption" TEXT,
    "altText" TEXT,
    "photographer" TEXT,
    "takenAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "isFeatured" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "width" INTEGER,
    "height" INTEGER,
    "authorId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GalleryMediaItem_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "GalleryAlbum" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GalleryMediaItem_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "GalleryMediaItem_ministryId_fkey" FOREIGN KEY ("ministryId") REFERENCES "Ministry" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "GalleryMediaItem_sermonId_fkey" FOREIGN KEY ("sermonId") REFERENCES "Sermon" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "GalleryMediaItem_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "GalleryMediaItem_slug_key" ON "GalleryMediaItem"("slug");
CREATE INDEX "GalleryMediaItem_albumId_idx" ON "GalleryMediaItem"("albumId");
CREATE INDEX "GalleryMediaItem_status_idx" ON "GalleryMediaItem"("status");
CREATE INDEX "GalleryMediaItem_mediaType_idx" ON "GalleryMediaItem"("mediaType");
CREATE INDEX "GalleryMediaItem_eventId_idx" ON "GalleryMediaItem"("eventId");
CREATE INDEX "GalleryMediaItem_ministryId_idx" ON "GalleryMediaItem"("ministryId");
CREATE INDEX "GalleryMediaItem_sermonId_idx" ON "GalleryMediaItem"("sermonId");
CREATE INDEX "GalleryMediaItem_sortOrder_idx" ON "GalleryMediaItem"("sortOrder");
CREATE INDEX "GalleryMediaItem_authorId_idx" ON "GalleryMediaItem"("authorId");

PRAGMA foreign_keys=ON;
