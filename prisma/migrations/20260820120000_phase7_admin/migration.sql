-- Phase 7: Leadership, expanded ministries, and admin dashboard indexes

PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Ministry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "leaderName" TEXT,
    "category" TEXT,
    "imageUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "leaderUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

INSERT INTO "new_Ministry" (
    "id", "slug", "name", "description", "leaderName", "isActive", "createdAt", "updatedAt"
)
SELECT "id", "id", "name", "description", "leaderName", "isActive", "createdAt", "updatedAt"
FROM "Ministry";

DROP TABLE "Ministry";
ALTER TABLE "new_Ministry" RENAME TO "Ministry";

CREATE UNIQUE INDEX "Ministry_slug_key" ON "Ministry"("slug");
CREATE INDEX "Ministry_status_idx" ON "Ministry"("status");
CREATE INDEX "Ministry_isActive_idx" ON "Ministry"("isActive");
CREATE INDEX "Ministry_category_idx" ON "Ministry"("category");
CREATE INDEX "Ministry_leaderUserId_idx" ON "Ministry"("leaderUserId");
CREATE INDEX "Ministry_sortOrder_idx" ON "Ministry"("sortOrder");

CREATE TABLE "LeadershipPosition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE INDEX "LeadershipPosition_isActive_idx" ON "LeadershipPosition"("isActive");
CREATE INDEX "LeadershipPosition_sortOrder_idx" ON "LeadershipPosition"("sortOrder");

CREATE TABLE "Leader" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "title" TEXT,
    "bio" TEXT,
    "photoUrl" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "positionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Leader_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "LeadershipPosition" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "Leader_status_idx" ON "Leader"("status");
CREATE INDEX "Leader_isActive_idx" ON "Leader"("isActive");
CREATE INDEX "Leader_positionId_idx" ON "Leader"("positionId");
CREATE INDEX "Leader_sortOrder_idx" ON "Leader"("sortOrder");

PRAGMA foreign_keys=ON;
