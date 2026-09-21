-- CreateTable
CREATE TABLE "CareAvailability" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "durationMin" INTEGER NOT NULL DEFAULT 45,
    "locationType" TEXT NOT NULL DEFAULT 'church',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CareAvailability_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "CareAvailability_userId_idx" ON "CareAvailability"("userId");

-- CreateIndex
CREATE INDEX "CareAvailability_weekday_isActive_idx" ON "CareAvailability"("weekday", "isActive");

