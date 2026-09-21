-- Phase 25: CMS center extensions

PRAGMA foreign_keys=OFF;

-- Rebuild CmsPage with visibility, language, expiresAt
CREATE TABLE "new_CmsPage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT,
    "content" TEXT NOT NULL,
    "featuredImageUrl" TEXT,
    "featuredImageAlt" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "visibility" TEXT NOT NULL DEFAULT 'public',
    "language" TEXT NOT NULL DEFAULT 'en',
    "isFeatured" BOOLEAN NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "ogImageUrl" TEXT,
    "authorId" TEXT NOT NULL,
    "publishedAt" DATETIME,
    "publishAt" DATETIME,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CmsPage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_CmsPage" (
  "id", "title", "slug", "excerpt", "content", "featuredImageUrl", "featuredImageAlt",
  "status", "visibility", "language", "isFeatured", "sortOrder", "seoTitle", "seoDescription",
  "ogImageUrl", "authorId", "publishedAt", "publishAt", "expiresAt", "createdAt", "updatedAt"
)
SELECT
  "id", "title", "slug", "excerpt", "content", "featuredImageUrl", "featuredImageAlt",
  "status", 'public', 'en', "isFeatured", "sortOrder", "seoTitle", "seoDescription",
  "ogImageUrl", "authorId", "publishedAt", "publishAt", NULL, "createdAt", "updatedAt"
FROM "CmsPage";
DROP TABLE "CmsPage";
ALTER TABLE "new_CmsPage" RENAME TO "CmsPage";
CREATE UNIQUE INDEX "CmsPage_slug_key" ON "CmsPage"("slug");
CREATE INDEX "CmsPage_status_idx" ON "CmsPage"("status");
CREATE INDEX "CmsPage_slug_idx" ON "CmsPage"("slug");
CREATE INDEX "CmsPage_authorId_idx" ON "CmsPage"("authorId");
CREATE INDEX "CmsPage_isFeatured_idx" ON "CmsPage"("isFeatured");
CREATE INDEX "CmsPage_sortOrder_idx" ON "CmsPage"("sortOrder");
CREATE INDEX "CmsPage_visibility_idx" ON "CmsPage"("visibility");
CREATE INDEX "CmsPage_language_idx" ON "CmsPage"("language");
CREATE INDEX "CmsPage_expiresAt_idx" ON "CmsPage"("expiresAt");

CREATE TABLE "CmsHomepageSection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT,
    "subtitle" TEXT,
    "body" TEXT,
    "configJson" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "CmsHomepageSection_key_key" ON "CmsHomepageSection"("key");
CREATE INDEX "CmsHomepageSection_isEnabled_idx" ON "CmsHomepageSection"("isEnabled");
CREATE INDEX "CmsHomepageSection_sortOrder_idx" ON "CmsHomepageSection"("sortOrder");
CREATE INDEX "CmsHomepageSection_type_idx" ON "CmsHomepageSection"("type");

CREATE TABLE "ContentRevision" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT,
    "slug" TEXT,
    "content" TEXT NOT NULL,
    "snapshotJson" TEXT,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ContentRevision_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ContentRevision_entityType_entityId_version_key" ON "ContentRevision"("entityType", "entityId", "version");
CREATE INDEX "ContentRevision_entityType_entityId_idx" ON "ContentRevision"("entityType", "entityId");
CREATE INDEX "ContentRevision_createdAt_idx" ON "ContentRevision"("createdAt");

CREATE TABLE "ContentRedirect" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "fromSlug" TEXT NOT NULL,
    "toSlug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "ContentRedirect_entityType_fromSlug_key" ON "ContentRedirect"("entityType", "fromSlug");
CREATE INDEX "ContentRedirect_fromSlug_idx" ON "ContentRedirect"("fromSlug");
CREATE INDEX "ContentRedirect_isActive_idx" ON "ContentRedirect"("isActive");
CREATE INDEX "ContentRedirect_entityId_idx" ON "ContentRedirect"("entityId");

CREATE TABLE "ContentTranslation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "title" TEXT,
    "excerpt" TEXT,
    "content" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "translatorId" TEXT,
    "publishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ContentTranslation_translatorId_fkey" FOREIGN KEY ("translatorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ContentTranslation_entityType_entityId_language_key" ON "ContentTranslation"("entityType", "entityId", "language");
CREATE INDEX "ContentTranslation_language_idx" ON "ContentTranslation"("language");
CREATE INDEX "ContentTranslation_status_idx" ON "ContentTranslation"("status");
CREATE INDEX "ContentTranslation_entityType_entityId_idx" ON "ContentTranslation"("entityType", "entityId");

CREATE TABLE "CmsFaq" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "language" TEXT NOT NULL DEFAULT 'en',
    "authorId" TEXT,
    "publishedAt" DATETIME,
    "publishAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CmsFaq_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "CmsFaq_status_idx" ON "CmsFaq"("status");
CREATE INDEX "CmsFaq_category_idx" ON "CmsFaq"("category");
CREATE INDEX "CmsFaq_sortOrder_idx" ON "CmsFaq"("sortOrder");
CREATE INDEX "CmsFaq_language_idx" ON "CmsFaq"("language");

CREATE TABLE "CmsTestimonial" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "photoUrl" TEXT,
    "permissionGranted" BOOLEAN NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "language" TEXT NOT NULL DEFAULT 'en',
    "authorId" TEXT,
    "publishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CmsTestimonial_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "CmsTestimonial_status_idx" ON "CmsTestimonial"("status");
CREATE INDEX "CmsTestimonial_sortOrder_idx" ON "CmsTestimonial"("sortOrder");
CREATE INDEX "CmsTestimonial_permissionGranted_idx" ON "CmsTestimonial"("permissionGranted");

CREATE TABLE "CmsMenu" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT 1,
    "updatedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CmsMenu_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CmsMenu_location_key" ON "CmsMenu"("location");
CREATE INDEX "CmsMenu_isActive_idx" ON "CmsMenu"("isActive");

CREATE TABLE "CmsMenuItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "menuId" TEXT NOT NULL,
    "parentId" TEXT,
    "label" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isEnabled" BOOLEAN NOT NULL DEFAULT 1,
    "openInNew" BOOLEAN NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CmsMenuItem_menuId_fkey" FOREIGN KEY ("menuId") REFERENCES "CmsMenu" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CmsMenuItem_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "CmsMenuItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "CmsMenuItem_menuId_idx" ON "CmsMenuItem"("menuId");
CREATE INDEX "CmsMenuItem_parentId_idx" ON "CmsMenuItem"("parentId");
CREATE INDEX "CmsMenuItem_sortOrder_idx" ON "CmsMenuItem"("sortOrder");
CREATE INDEX "CmsMenuItem_isEnabled_idx" ON "CmsMenuItem"("isEnabled");

PRAGMA foreign_keys=ON;
