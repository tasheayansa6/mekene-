-- Phase 28: Online giving extensions (funds metadata, providers, QR, settings)

-- AlterTable DonationCategory
ALTER TABLE "DonationCategory" ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "DonationCategory" ADD COLUMN "supportedCurrencies" TEXT NOT NULL DEFAULT 'ETB';
ALTER TABLE "DonationCategory" ADD COLUMN "presetAmounts" TEXT;
ALTER TABLE "DonationCategory" ADD COLUMN "accountingCode" TEXT;
ALTER TABLE "DonationCategory" ADD COLUMN "ministryId" TEXT;
ALTER TABLE "DonationCategory" ADD COLUMN "eventId" TEXT;

-- AlterTable Contribution
ALTER TABLE "Contribution" ADD COLUMN "eventId" TEXT;
ALTER TABLE "Contribution" ADD COLUMN "expiresAt" DATETIME;

-- CreateTable
CREATE TABLE "PaymentProviderConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "providerKey" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "environment" TEXT NOT NULL DEFAULT 'sandbox',
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "publicKey" TEXT,
    "secretEnvKey" TEXT,
    "webhookPath" TEXT,
    "supportedCurrencies" TEXT NOT NULL DEFAULT 'ETB',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ChurchGivingSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "givingYearStartMonth" INTEGER NOT NULL DEFAULT 1,
    "supportedCurrencies" TEXT NOT NULL DEFAULT 'ETB',
    "defaultCurrency" TEXT NOT NULL DEFAULT 'ETB',
    "legalChurchName" TEXT,
    "registrationInfo" TEXT,
    "donationTerms" TEXT,
    "refundPolicyNote" TEXT,
    "privacyNote" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "GivingQrLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "targetType" TEXT NOT NULL DEFAULT 'general',
    "categorySlug" TEXT,
    "campaignSlug" TEXT,
    "ministrySlug" TEXT,
    "eventSlug" TEXT,
    "amountPreset" TEXT,
    "currency" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GivingQrLink_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "PaymentProviderConfig_providerKey_key" ON "PaymentProviderConfig"("providerKey");
CREATE INDEX "PaymentProviderConfig_isEnabled_idx" ON "PaymentProviderConfig"("isEnabled");
CREATE INDEX "PaymentProviderConfig_providerKey_idx" ON "PaymentProviderConfig"("providerKey");

CREATE UNIQUE INDEX "GivingQrLink_slug_key" ON "GivingQrLink"("slug");
CREATE INDEX "GivingQrLink_isActive_idx" ON "GivingQrLink"("isActive");
CREATE INDEX "GivingQrLink_targetType_idx" ON "GivingQrLink"("targetType");
CREATE INDEX "GivingQrLink_createdAt_idx" ON "GivingQrLink"("createdAt");

CREATE INDEX "DonationCategory_isPublic_idx" ON "DonationCategory"("isPublic");
CREATE INDEX "DonationCategory_ministryId_idx" ON "DonationCategory"("ministryId");
CREATE INDEX "DonationCategory_eventId_idx" ON "DonationCategory"("eventId");

CREATE INDEX "Contribution_eventId_idx" ON "Contribution"("eventId");
CREATE INDEX "Contribution_completedAt_idx" ON "Contribution"("completedAt");
CREATE INDEX "Contribution_expiresAt_idx" ON "Contribution"("expiresAt");
