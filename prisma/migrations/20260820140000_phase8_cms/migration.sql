-- Phase 8 CMS: replace stub Announcement/Resource and add pages, news, categories, tags

PRAGMA foreign_keys=OFF;

DROP TABLE IF EXISTS "Announcement";
DROP TABLE IF EXISTS "Resource";

CREATE TABLE "ContentCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "scope" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "ContentCategory_scope_slug_key" ON "ContentCategory"("scope", "slug");
CREATE INDEX "ContentCategory_scope_idx" ON "ContentCategory"("scope");

CREATE TABLE "ContentTag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "ContentTag_slug_key" ON "ContentTag"("slug");

CREATE TABLE "CmsPage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT,
    "content" TEXT NOT NULL,
    "featuredImageUrl" TEXT,
    "featuredImageAlt" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "ogImageUrl" TEXT,
    "authorId" TEXT NOT NULL,
    "publishedAt" DATETIME,
    "publishAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CmsPage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CmsPage_slug_key" ON "CmsPage"("slug");
CREATE INDEX "CmsPage_status_idx" ON "CmsPage"("status");
CREATE INDEX "CmsPage_slug_idx" ON "CmsPage"("slug");
CREATE INDEX "CmsPage_authorId_idx" ON "CmsPage"("authorId");
CREATE INDEX "CmsPage_isFeatured_idx" ON "CmsPage"("isFeatured");
CREATE INDEX "CmsPage_sortOrder_idx" ON "CmsPage"("sortOrder");

CREATE TABLE "NewsArticle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT,
    "content" TEXT NOT NULL,
    "featuredImageUrl" TEXT,
    "featuredImageAlt" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "ogImageUrl" TEXT,
    "categoryId" TEXT,
    "authorId" TEXT NOT NULL,
    "publishedAt" DATETIME,
    "publishAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "NewsArticle_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ContentCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "NewsArticle_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "NewsArticle_slug_key" ON "NewsArticle"("slug");
CREATE INDEX "NewsArticle_status_idx" ON "NewsArticle"("status");
CREATE INDEX "NewsArticle_slug_idx" ON "NewsArticle"("slug");
CREATE INDEX "NewsArticle_authorId_idx" ON "NewsArticle"("authorId");
CREATE INDEX "NewsArticle_categoryId_idx" ON "NewsArticle"("categoryId");
CREATE INDEX "NewsArticle_isFeatured_idx" ON "NewsArticle"("isFeatured");
CREATE INDEX "NewsArticle_publishedAt_idx" ON "NewsArticle"("publishedAt");

CREATE TABLE "NewsArticleTag" (
    "newsId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    CONSTRAINT "NewsArticleTag_newsId_fkey" FOREIGN KEY ("newsId") REFERENCES "NewsArticle" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "NewsArticleTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "ContentTag" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    PRIMARY KEY ("newsId", "tagId")
);
CREATE INDEX "NewsArticleTag_tagId_idx" ON "NewsArticleTag"("tagId");

CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "startAt" DATETIME NOT NULL,
    "endAt" DATETIME,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "featuredImageUrl" TEXT,
    "featuredImageAlt" TEXT,
    "authorId" TEXT NOT NULL,
    "publishedAt" DATETIME,
    "publishAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Announcement_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Announcement_slug_key" ON "Announcement"("slug");
CREATE INDEX "Announcement_status_idx" ON "Announcement"("status");
CREATE INDEX "Announcement_startAt_idx" ON "Announcement"("startAt");
CREATE INDEX "Announcement_endAt_idx" ON "Announcement"("endAt");
CREATE INDEX "Announcement_isFeatured_idx" ON "Announcement"("isFeatured");
CREATE INDEX "Announcement_authorId_idx" ON "Announcement"("authorId");

CREATE TABLE "Resource" (
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
    "status" TEXT NOT NULL DEFAULT 'draft',
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
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
CREATE UNIQUE INDEX "Resource_slug_key" ON "Resource"("slug");
CREATE INDEX "Resource_status_idx" ON "Resource"("status");
CREATE INDEX "Resource_slug_idx" ON "Resource"("slug");
CREATE INDEX "Resource_categoryId_idx" ON "Resource"("categoryId");
CREATE INDEX "Resource_authorId_idx" ON "Resource"("authorId");
CREATE INDEX "Resource_isFeatured_idx" ON "Resource"("isFeatured");

PRAGMA foreign_keys=ON;
