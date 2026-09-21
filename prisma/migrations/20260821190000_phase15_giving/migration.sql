-- Phase 15: Church Donations, Tithes & Offering Management
-- Replaces foundation Donation stub. Amounts use Decimal (no floating-point money).

PRAGMA foreign_keys=OFF;

DROP TABLE IF EXISTS "Donation";

CREATE TABLE "DonationCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "minAmount" DECIMAL NOT NULL DEFAULT 1.00,
    "maxAmount" DECIMAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "DonationCategory_slug_key" ON "DonationCategory"("slug");
CREATE INDEX "DonationCategory_isActive_idx" ON "DonationCategory"("isActive");
CREATE INDEX "DonationCategory_sortOrder_idx" ON "DonationCategory"("sortOrder");

CREATE TABLE "DonationCampaign" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "targetAmount" DECIMAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ETB',
    "startAt" DATETIME,
    "endAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "coverImageUrl" TEXT,
    "categoryId" TEXT,
    "ministryId" TEXT,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DonationCampaign_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "DonationCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DonationCampaign_ministryId_fkey" FOREIGN KEY ("ministryId") REFERENCES "Ministry" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DonationCampaign_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "DonationCampaign_slug_key" ON "DonationCampaign"("slug");
CREATE INDEX "DonationCampaign_status_idx" ON "DonationCampaign"("status");
CREATE INDEX "DonationCampaign_slug_idx" ON "DonationCampaign"("slug");
CREATE INDEX "DonationCampaign_ministryId_idx" ON "DonationCampaign"("ministryId");
CREATE INDEX "DonationCampaign_categoryId_idx" ON "DonationCampaign"("categoryId");

CREATE TABLE "Contribution" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reference" TEXT NOT NULL,
    "receiptNumber" TEXT,
    "amount" DECIMAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ETB',
    "refundedAmount" DECIMAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "paymentMethod" TEXT NOT NULL DEFAULT 'online',
    "isAnonymous" BOOLEAN NOT NULL DEFAULT 0,
    "note" TEXT,
    "offlineReference" TEXT,
    "idempotencyKey" TEXT,
    "userId" TEXT,
    "memberId" TEXT,
    "guestName" TEXT,
    "guestEmail" TEXT,
    "categoryId" TEXT NOT NULL,
    "campaignId" TEXT,
    "ministryId" TEXT,
    "recordedById" TEXT,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Contribution_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Contribution_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Contribution_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "DonationCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Contribution_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "DonationCampaign" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Contribution_ministryId_fkey" FOREIGN KEY ("ministryId") REFERENCES "Ministry" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Contribution_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Contribution_reference_key" ON "Contribution"("reference");
CREATE UNIQUE INDEX "Contribution_receiptNumber_key" ON "Contribution"("receiptNumber");
CREATE UNIQUE INDEX "Contribution_idempotencyKey_key" ON "Contribution"("idempotencyKey");
CREATE INDEX "Contribution_status_idx" ON "Contribution"("status");
CREATE INDEX "Contribution_userId_idx" ON "Contribution"("userId");
CREATE INDEX "Contribution_memberId_idx" ON "Contribution"("memberId");
CREATE INDEX "Contribution_categoryId_idx" ON "Contribution"("categoryId");
CREATE INDEX "Contribution_campaignId_idx" ON "Contribution"("campaignId");
CREATE INDEX "Contribution_createdAt_idx" ON "Contribution"("createdAt");
CREATE INDEX "Contribution_paymentMethod_idx" ON "Contribution"("paymentMethod");

CREATE TABLE "PaymentTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contributionId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerReference" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ETB',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "failureReason" TEXT,
    "initiatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PaymentTransaction_contributionId_fkey" FOREIGN KEY ("contributionId") REFERENCES "Contribution" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "PaymentTransaction_idempotencyKey_key" ON "PaymentTransaction"("idempotencyKey");
CREATE UNIQUE INDEX "PaymentTransaction_provider_providerReference_key" ON "PaymentTransaction"("provider", "providerReference");
CREATE INDEX "PaymentTransaction_contributionId_idx" ON "PaymentTransaction"("contributionId");
CREATE INDEX "PaymentTransaction_status_idx" ON "PaymentTransaction"("status");
CREATE INDEX "PaymentTransaction_provider_idx" ON "PaymentTransaction"("provider");

CREATE TABLE "ContributionRefund" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contributionId" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ETB',
    "reason" TEXT NOT NULL,
    "recordedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ContributionRefund_contributionId_fkey" FOREIGN KEY ("contributionId") REFERENCES "Contribution" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ContributionRefund_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "ContributionRefund_contributionId_idx" ON "ContributionRefund"("contributionId");
CREATE INDEX "ContributionRefund_createdAt_idx" ON "ContributionRefund"("createdAt");

CREATE TABLE "Pledge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "memberId" TEXT,
    "campaignId" TEXT,
    "amount" DECIMAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ETB',
    "frequency" TEXT NOT NULL DEFAULT 'one_time',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "startAt" DATETIME,
    "endAt" DATETIME,
    "note" TEXT,
    "providerSubscriptionId" TEXT,
    "fulfilledContributionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Pledge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Pledge_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Pledge_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "DonationCampaign" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Pledge_fulfilledContributionId_fkey" FOREIGN KEY ("fulfilledContributionId") REFERENCES "Contribution" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "Pledge_userId_idx" ON "Pledge"("userId");
CREATE INDEX "Pledge_campaignId_idx" ON "Pledge"("campaignId");
CREATE INDEX "Pledge_status_idx" ON "Pledge"("status");

CREATE TABLE "PaymentWebhookEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provider" TEXT NOT NULL,
    "eventKey" TEXT NOT NULL,
    "processingStatus" TEXT NOT NULL DEFAULT 'received',
    "signatureValid" BOOLEAN NOT NULL DEFAULT 0,
    "contributionId" TEXT,
    "transactionId" TEXT,
    "summary" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" DATETIME
);

CREATE UNIQUE INDEX "PaymentWebhookEvent_provider_eventKey_key" ON "PaymentWebhookEvent"("provider", "eventKey");
CREATE INDEX "PaymentWebhookEvent_processingStatus_idx" ON "PaymentWebhookEvent"("processingStatus");
CREATE INDEX "PaymentWebhookEvent_createdAt_idx" ON "PaymentWebhookEvent"("createdAt");

CREATE TABLE "ReceiptSequence" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "prefix" TEXT NOT NULL DEFAULT 'BME-REC',
    "nextValue" INTEGER NOT NULL DEFAULT 1
);

INSERT INTO "ReceiptSequence" ("id", "prefix", "nextValue") VALUES ('default', 'BME-REC', 1);

PRAGMA foreign_keys=ON;
