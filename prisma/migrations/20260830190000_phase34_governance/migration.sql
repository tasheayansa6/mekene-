-- Phase 34: Church Administration & Governance

-- AlterTable
ALTER TABLE "LeadershipPosition" ADD COLUMN "responsibilities" TEXT;
ALTER TABLE "LeadershipPosition" ADD COLUMN "termMonths" INTEGER;

-- CreateTable
CREATE TABLE "GovernanceAppointment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "positionId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "startAt" DATETIME NOT NULL,
    "endAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'active',
    "replacedById" TEXT,
    "organizationLabel" TEXT,
    "notes" TEXT,
    "appointedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GovernanceAppointment_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "LeadershipPosition" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "GovernanceAppointment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "GovernanceAppointment_replacedById_fkey" FOREIGN KEY ("replacedById") REFERENCES "GovernanceAppointment" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "GovernanceAppointment_appointedById_fkey" FOREIGN KEY ("appointedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Committee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "responsibilities" TEXT,
    "ministryId" TEXT,
    "chairUserId" TEXT,
    "secretaryUserId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "quorumCount" INTEGER,
    "quorumPercent" INTEGER,
    "termMonths" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Committee_ministryId_fkey" FOREIGN KEY ("ministryId") REFERENCES "Ministry" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Committee_chairUserId_fkey" FOREIGN KEY ("chairUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Committee_secretaryUserId_fkey" FOREIGN KEY ("secretaryUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CommitteeMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "committeeId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "roleLabel" TEXT NOT NULL DEFAULT 'member',
    "startAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CommitteeMember_committeeId_fkey" FOREIGN KEY ("committeeId") REFERENCES "Committee" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CommitteeMember_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GovernanceMeeting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "meetingType" TEXT NOT NULL DEFAULT 'committee',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "committeeId" TEXT,
    "ministryId" TEXT,
    "eventId" TEXT,
    "startsAt" DATETIME NOT NULL,
    "endsAt" DATETIME,
    "location" TEXT,
    "onlineUrl" TEXT,
    "chairUserId" TEXT,
    "secretaryUserId" TEXT,
    "agendaLocked" BOOLEAN NOT NULL DEFAULT false,
    "quorumCount" INTEGER,
    "quorumPercent" INTEGER,
    "autoValidateLegal" BOOLEAN NOT NULL DEFAULT false,
    "votingMethod" TEXT,
    "votingCustomRule" TEXT,
    "votingClosed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GovernanceMeeting_committeeId_fkey" FOREIGN KEY ("committeeId") REFERENCES "Committee" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "GovernanceMeeting_ministryId_fkey" FOREIGN KEY ("ministryId") REFERENCES "Ministry" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "GovernanceMeeting_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "GovernanceMeeting_chairUserId_fkey" FOREIGN KEY ("chairUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "GovernanceMeeting_secretaryUserId_fkey" FOREIGN KEY ("secretaryUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AgendaItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "meetingId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "presenterId" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "durationMin" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'proposed',
    "attachmentUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AgendaItem_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "GovernanceMeeting" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AgendaItem_presenterId_fkey" FOREIGN KEY ("presenterId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MeetingParticipant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "meetingId" TEXT NOT NULL,
    "memberId" TEXT,
    "userId" TEXT,
    "displayName" TEXT,
    "attendance" TEXT NOT NULL DEFAULT 'invited',
    "isEligible" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MeetingParticipant_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "GovernanceMeeting" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MeetingParticipant_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MeetingMinute" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "meetingId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "summary" TEXT,
    "discussionNotes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "authorId" TEXT,
    "approvedAt" DATETIME,
    "lockedAt" DATETIME,
    "amendmentOfId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MeetingMinute_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "GovernanceMeeting" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MeetingMinute_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MeetingMinute_amendmentOfId_fkey" FOREIGN KEY ("amendmentOfId") REFERENCES "MeetingMinute" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GovernanceDecision" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "meetingId" TEXT,
    "agendaItemId" TEXT,
    "committeeId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "decisionDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'proposed',
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GovernanceDecision_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "GovernanceMeeting" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "GovernanceDecision_agendaItemId_fkey" FOREIGN KEY ("agendaItemId") REFERENCES "AgendaItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "GovernanceDecision_committeeId_fkey" FOREIGN KEY ("committeeId") REFERENCES "Committee" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "GovernanceDecision_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Resolution" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "resolutionNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "meetingId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "decidedAt" DATETIME,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Resolution_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "GovernanceMeeting" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Resolution_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GovernanceVote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "meetingId" TEXT NOT NULL,
    "resolutionId" TEXT,
    "participantId" TEXT,
    "voterUserId" TEXT NOT NULL,
    "choice" TEXT NOT NULL,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GovernanceVote_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "GovernanceMeeting" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GovernanceVote_resolutionId_fkey" FOREIGN KEY ("resolutionId") REFERENCES "Resolution" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GovernanceVote_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "MeetingParticipant" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "GovernanceVote_voterUserId_fkey" FOREIGN KEY ("voterUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GovernanceActionItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "meetingId" TEXT,
    "decisionId" TEXT,
    "committeeId" TEXT,
    "ownerMemberId" TEXT,
    "assigneeUserId" TEXT,
    "volunteerTaskId" TEXT,
    "dueAt" DATETIME,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GovernanceActionItem_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "GovernanceMeeting" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "GovernanceActionItem_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "GovernanceDecision" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "GovernanceActionItem_committeeId_fkey" FOREIGN KEY ("committeeId") REFERENCES "Committee" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "GovernanceActionItem_ownerMemberId_fkey" FOREIGN KEY ("ownerMemberId") REFERENCES "Member" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "GovernanceActionItem_assigneeUserId_fkey" FOREIGN KEY ("assigneeUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "GovernanceActionItem_volunteerTaskId_fkey" FOREIGN KEY ("volunteerTaskId") REFERENCES "VolunteerTask" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GovernancePolicy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "committeeId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "authorId" TEXT,
    "requireAck" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GovernancePolicy_committeeId_fkey" FOREIGN KEY ("committeeId") REFERENCES "Committee" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "GovernancePolicy_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PolicyVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "policyId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "authorId" TEXT,
    "publishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PolicyVersion_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "GovernancePolicy" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PolicyVersion_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PolicyAcknowledgement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "policyVersionId" TEXT NOT NULL,
    "memberId" TEXT,
    "userId" TEXT NOT NULL,
    "acknowledgedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'acknowledged',
    CONSTRAINT "PolicyAcknowledgement_policyVersionId_fkey" FOREIGN KEY ("policyVersionId") REFERENCES "PolicyVersion" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PolicyAcknowledgement_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GovernanceDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fileKey" TEXT NOT NULL,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "version" INTEGER NOT NULL DEFAULT 1,
    "accessLevel" TEXT NOT NULL DEFAULT 'restricted',
    "committeeId" TEXT,
    "policyId" TEXT,
    "resolutionId" TEXT,
    "meetingId" TEXT,
    "uploadedById" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GovernanceDocument_committeeId_fkey" FOREIGN KEY ("committeeId") REFERENCES "Committee" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "GovernanceDocument_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "GovernancePolicy" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "GovernanceDocument_resolutionId_fkey" FOREIGN KEY ("resolutionId") REFERENCES "Resolution" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "GovernanceDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AdminRequestCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "slaHours" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AdministrativeRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "categoryId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "assigneeUserId" TEXT,
    "assignedMinistryId" TEXT,
    "assignedCommitteeId" TEXT,
    "responseDueAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AdministrativeRequest_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "AdminRequestCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AdministrativeRequest_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AdministrativeRequest_assigneeUserId_fkey" FOREIGN KEY ("assigneeUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AdminRequestNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdminRequestNote_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "AdministrativeRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AdminRequestNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ApprovalWorkflow" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ApprovalStep" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workflowId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "mode" TEXT NOT NULL DEFAULT 'sequential',
    "requiredCount" INTEGER NOT NULL DEFAULT 1,
    "roleSlug" TEXT,
    "deadlineHours" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ApprovalStep_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "ApprovalWorkflow" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ApprovalAction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workflowId" TEXT NOT NULL,
    "stepId" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "comment" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ApprovalAction_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "ApprovalWorkflow" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ApprovalAction_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "ApprovalStep" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ApprovalAction_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ApprovalDelegation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workflowId" TEXT,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "scope" TEXT,
    "startAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endAt" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ApprovalDelegation_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "ApprovalWorkflow" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ApprovalDelegation_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ApprovalDelegation_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GovernanceSetting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Contribution" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reference" TEXT NOT NULL,
    "receiptNumber" TEXT,
    "amount" DECIMAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ETB',
    "refundedAmount" DECIMAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "paymentMethod" TEXT NOT NULL DEFAULT 'online',
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
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
    "eventId" TEXT,
    "recordedById" TEXT,
    "completedAt" DATETIME,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Contribution_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Contribution_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Contribution_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "DonationCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Contribution_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "DonationCampaign" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Contribution_ministryId_fkey" FOREIGN KEY ("ministryId") REFERENCES "Ministry" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Contribution_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Contribution_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Contribution" ("amount", "campaignId", "categoryId", "completedAt", "createdAt", "currency", "eventId", "expiresAt", "guestEmail", "guestName", "id", "idempotencyKey", "isAnonymous", "memberId", "ministryId", "note", "offlineReference", "paymentMethod", "receiptNumber", "recordedById", "reference", "refundedAmount", "status", "updatedAt", "userId") SELECT "amount", "campaignId", "categoryId", "completedAt", "createdAt", "currency", "eventId", "expiresAt", "guestEmail", "guestName", "id", "idempotencyKey", "isAnonymous", "memberId", "ministryId", "note", "offlineReference", "paymentMethod", "receiptNumber", "recordedById", "reference", "refundedAmount", "status", "updatedAt", "userId" FROM "Contribution";
DROP TABLE "Contribution";
ALTER TABLE "new_Contribution" RENAME TO "Contribution";
CREATE UNIQUE INDEX "Contribution_reference_key" ON "Contribution"("reference");
CREATE UNIQUE INDEX "Contribution_receiptNumber_key" ON "Contribution"("receiptNumber");
CREATE UNIQUE INDEX "Contribution_idempotencyKey_key" ON "Contribution"("idempotencyKey");
CREATE INDEX "Contribution_status_idx" ON "Contribution"("status");
CREATE INDEX "Contribution_userId_idx" ON "Contribution"("userId");
CREATE INDEX "Contribution_memberId_idx" ON "Contribution"("memberId");
CREATE INDEX "Contribution_categoryId_idx" ON "Contribution"("categoryId");
CREATE INDEX "Contribution_campaignId_idx" ON "Contribution"("campaignId");
CREATE INDEX "Contribution_eventId_idx" ON "Contribution"("eventId");
CREATE INDEX "Contribution_createdAt_idx" ON "Contribution"("createdAt");
CREATE INDEX "Contribution_completedAt_idx" ON "Contribution"("completedAt");
CREATE INDEX "Contribution_paymentMethod_idx" ON "Contribution"("paymentMethod");
CREATE INDEX "Contribution_expiresAt_idx" ON "Contribution"("expiresAt");
CREATE TABLE "new_DonationCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "minAmount" DECIMAL NOT NULL DEFAULT 1.00,
    "maxAmount" DECIMAL,
    "supportedCurrencies" TEXT NOT NULL DEFAULT 'ETB',
    "presetAmounts" TEXT,
    "accountingCode" TEXT,
    "ministryId" TEXT,
    "eventId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DonationCategory_ministryId_fkey" FOREIGN KEY ("ministryId") REFERENCES "Ministry" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DonationCategory_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_DonationCategory" ("accountingCode", "createdAt", "description", "eventId", "id", "isActive", "isPublic", "maxAmount", "minAmount", "ministryId", "name", "presetAmounts", "slug", "sortOrder", "supportedCurrencies", "updatedAt") SELECT "accountingCode", "createdAt", "description", "eventId", "id", "isActive", "isPublic", "maxAmount", "minAmount", "ministryId", "name", "presetAmounts", "slug", "sortOrder", "supportedCurrencies", "updatedAt" FROM "DonationCategory";
DROP TABLE "DonationCategory";
ALTER TABLE "new_DonationCategory" RENAME TO "DonationCategory";
CREATE UNIQUE INDEX "DonationCategory_slug_key" ON "DonationCategory"("slug");
CREATE INDEX "DonationCategory_isActive_idx" ON "DonationCategory"("isActive");
CREATE INDEX "DonationCategory_isPublic_idx" ON "DonationCategory"("isPublic");
CREATE INDEX "DonationCategory_sortOrder_idx" ON "DonationCategory"("sortOrder");
CREATE INDEX "DonationCategory_ministryId_idx" ON "DonationCategory"("ministryId");
CREATE INDEX "DonationCategory_eventId_idx" ON "DonationCategory"("eventId");
CREATE TABLE "new_GalleryAlbum" (
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
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
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
INSERT INTO "new_GalleryAlbum" ("albumDate", "authorId", "categoryId", "coverImageAlt", "coverImageUrl", "createdAt", "description", "eventId", "id", "isFeatured", "ministryId", "publishAt", "publishedAt", "seoDescription", "seoTitle", "slug", "status", "title", "updatedAt") SELECT "albumDate", "authorId", "categoryId", "coverImageAlt", "coverImageUrl", "createdAt", "description", "eventId", "id", "isFeatured", "ministryId", "publishAt", "publishedAt", "seoDescription", "seoTitle", "slug", "status", "title", "updatedAt" FROM "GalleryAlbum";
DROP TABLE "GalleryAlbum";
ALTER TABLE "new_GalleryAlbum" RENAME TO "GalleryAlbum";
CREATE UNIQUE INDEX "GalleryAlbum_slug_key" ON "GalleryAlbum"("slug");
CREATE INDEX "GalleryAlbum_status_idx" ON "GalleryAlbum"("status");
CREATE INDEX "GalleryAlbum_slug_idx" ON "GalleryAlbum"("slug");
CREATE INDEX "GalleryAlbum_categoryId_idx" ON "GalleryAlbum"("categoryId");
CREATE INDEX "GalleryAlbum_eventId_idx" ON "GalleryAlbum"("eventId");
CREATE INDEX "GalleryAlbum_ministryId_idx" ON "GalleryAlbum"("ministryId");
CREATE INDEX "GalleryAlbum_isFeatured_idx" ON "GalleryAlbum"("isFeatured");
CREATE INDEX "GalleryAlbum_albumDate_idx" ON "GalleryAlbum"("albumDate");
CREATE INDEX "GalleryAlbum_authorId_idx" ON "GalleryAlbum"("authorId");
CREATE TABLE "new_GalleryMediaItem" (
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
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
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
INSERT INTO "new_GalleryMediaItem" ("albumId", "altText", "authorId", "caption", "createdAt", "description", "eventId", "externalUrl", "fileUrl", "height", "id", "isFeatured", "mediaType", "ministryId", "photographer", "sermonId", "slug", "sortOrder", "status", "takenAt", "thumbnailUrl", "title", "updatedAt", "width") SELECT "albumId", "altText", "authorId", "caption", "createdAt", "description", "eventId", "externalUrl", "fileUrl", "height", "id", "isFeatured", "mediaType", "ministryId", "photographer", "sermonId", "slug", "sortOrder", "status", "takenAt", "thumbnailUrl", "title", "updatedAt", "width" FROM "GalleryMediaItem";
DROP TABLE "GalleryMediaItem";
ALTER TABLE "new_GalleryMediaItem" RENAME TO "GalleryMediaItem";
CREATE UNIQUE INDEX "GalleryMediaItem_slug_key" ON "GalleryMediaItem"("slug");
CREATE INDEX "GalleryMediaItem_albumId_idx" ON "GalleryMediaItem"("albumId");
CREATE INDEX "GalleryMediaItem_status_idx" ON "GalleryMediaItem"("status");
CREATE INDEX "GalleryMediaItem_mediaType_idx" ON "GalleryMediaItem"("mediaType");
CREATE INDEX "GalleryMediaItem_eventId_idx" ON "GalleryMediaItem"("eventId");
CREATE INDEX "GalleryMediaItem_ministryId_idx" ON "GalleryMediaItem"("ministryId");
CREATE INDEX "GalleryMediaItem_sermonId_idx" ON "GalleryMediaItem"("sermonId");
CREATE INDEX "GalleryMediaItem_sortOrder_idx" ON "GalleryMediaItem"("sortOrder");
CREATE INDEX "GalleryMediaItem_authorId_idx" ON "GalleryMediaItem"("authorId");
CREATE TABLE "new_MinistryTeam" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ministryId" TEXT NOT NULL,
    "departmentId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "leaderUserId" TEXT,
    "assistantLeaderUserId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MinistryTeam_ministryId_fkey" FOREIGN KEY ("ministryId") REFERENCES "Ministry" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MinistryTeam_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "MinistryDepartment" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MinistryTeam_leaderUserId_fkey" FOREIGN KEY ("leaderUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MinistryTeam_assistantLeaderUserId_fkey" FOREIGN KEY ("assistantLeaderUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_MinistryTeam" ("assistantLeaderUserId", "createdAt", "departmentId", "description", "id", "isActive", "leaderUserId", "ministryId", "name", "slug", "updatedAt") SELECT "assistantLeaderUserId", "createdAt", "departmentId", "description", "id", "isActive", "leaderUserId", "ministryId", "name", "slug", "updatedAt" FROM "MinistryTeam";
DROP TABLE "MinistryTeam";
ALTER TABLE "new_MinistryTeam" RENAME TO "MinistryTeam";
CREATE INDEX "MinistryTeam_ministryId_idx" ON "MinistryTeam"("ministryId");
CREATE INDEX "MinistryTeam_departmentId_idx" ON "MinistryTeam"("departmentId");
CREATE INDEX "MinistryTeam_leaderUserId_idx" ON "MinistryTeam"("leaderUserId");
CREATE INDEX "MinistryTeam_assistantLeaderUserId_idx" ON "MinistryTeam"("assistantLeaderUserId");
CREATE INDEX "MinistryTeam_isActive_idx" ON "MinistryTeam"("isActive");
CREATE UNIQUE INDEX "MinistryTeam_ministryId_slug_key" ON "MinistryTeam"("ministryId", "slug");
CREATE TABLE "new_PrayerRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "userId" TEXT,
    "guestName" TEXT,
    "guestEmail" TEXT,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "visibility" TEXT NOT NULL DEFAULT 'private',
    "status" TEXT NOT NULL DEFAULT 'new',
    "categoryId" TEXT,
    "assignedToId" TEXT,
    "publicApproved" BOOLEAN NOT NULL DEFAULT false,
    "approvedAt" DATETIME,
    "answeredAt" DATETIME,
    "archivedAt" DATETIME,
    "rejectedAt" DATETIME,
    "prayedCount" INTEGER NOT NULL DEFAULT 0,
    "requesterMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PrayerRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PrayerRequest_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PrayerRequest_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "PrayerCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_PrayerRequest" ("answeredAt", "approvedAt", "archivedAt", "assignedToId", "categoryId", "content", "createdAt", "guestEmail", "guestName", "id", "isAnonymous", "prayedCount", "publicApproved", "rejectedAt", "requesterMessage", "status", "title", "updatedAt", "userId", "visibility") SELECT "answeredAt", "approvedAt", "archivedAt", "assignedToId", "categoryId", "content", "createdAt", "guestEmail", "guestName", "id", "isAnonymous", "prayedCount", "publicApproved", "rejectedAt", "requesterMessage", "status", "title", "updatedAt", "userId", "visibility" FROM "PrayerRequest";
DROP TABLE "PrayerRequest";
ALTER TABLE "new_PrayerRequest" RENAME TO "PrayerRequest";
CREATE INDEX "PrayerRequest_status_idx" ON "PrayerRequest"("status");
CREATE INDEX "PrayerRequest_visibility_publicApproved_idx" ON "PrayerRequest"("visibility", "publicApproved");
CREATE INDEX "PrayerRequest_userId_idx" ON "PrayerRequest"("userId");
CREATE INDEX "PrayerRequest_assignedToId_idx" ON "PrayerRequest"("assignedToId");
CREATE INDEX "PrayerRequest_categoryId_idx" ON "PrayerRequest"("categoryId");
CREATE INDEX "PrayerRequest_createdAt_idx" ON "PrayerRequest"("createdAt");
CREATE TABLE "new_ServiceAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "ministryId" TEXT,
    "teamId" TEXT,
    "roleId" TEXT,
    "roleName" TEXT NOT NULL,
    "scheduledAt" DATETIME NOT NULL,
    "endsAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'proposed',
    "declineReason" TEXT,
    "attendanceStatus" TEXT,
    "checkInAt" DATETIME,
    "checkOutAt" DATETIME,
    "hoursMinutes" INTEGER,
    "checkInTokenHash" TEXT,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ServiceAssignment_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ServiceAssignment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ServiceAssignment_ministryId_fkey" FOREIGN KEY ("ministryId") REFERENCES "Ministry" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ServiceAssignment_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "MinistryTeam" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ServiceAssignment_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "VolunteerRole" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ServiceAssignment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ServiceAssignment" ("attendanceStatus", "checkInAt", "checkInTokenHash", "checkOutAt", "createdAt", "createdById", "declineReason", "endsAt", "eventId", "hoursMinutes", "id", "memberId", "ministryId", "roleId", "roleName", "scheduledAt", "status", "teamId", "updatedAt") SELECT "attendanceStatus", "checkInAt", "checkInTokenHash", "checkOutAt", "createdAt", "createdById", "declineReason", "endsAt", "eventId", "hoursMinutes", "id", "memberId", "ministryId", "roleId", "roleName", "scheduledAt", "status", "teamId", "updatedAt" FROM "ServiceAssignment";
DROP TABLE "ServiceAssignment";
ALTER TABLE "new_ServiceAssignment" RENAME TO "ServiceAssignment";
CREATE UNIQUE INDEX "ServiceAssignment_checkInTokenHash_key" ON "ServiceAssignment"("checkInTokenHash");
CREATE INDEX "ServiceAssignment_eventId_idx" ON "ServiceAssignment"("eventId");
CREATE INDEX "ServiceAssignment_memberId_idx" ON "ServiceAssignment"("memberId");
CREATE INDEX "ServiceAssignment_ministryId_idx" ON "ServiceAssignment"("ministryId");
CREATE INDEX "ServiceAssignment_teamId_idx" ON "ServiceAssignment"("teamId");
CREATE INDEX "ServiceAssignment_roleId_idx" ON "ServiceAssignment"("roleId");
CREATE INDEX "ServiceAssignment_scheduledAt_idx" ON "ServiceAssignment"("scheduledAt");
CREATE INDEX "ServiceAssignment_status_idx" ON "ServiceAssignment"("status");
CREATE INDEX "ServiceAssignment_attendanceStatus_idx" ON "ServiceAssignment"("attendanceStatus");
CREATE TABLE "new_VolunteerQualification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "issuer" TEXT,
    "earnedAt" DATETIME,
    "expiresAt" DATETIME,
    "programId" TEXT,
    "fileUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VolunteerQualification_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VolunteerQualification_programId_fkey" FOREIGN KEY ("programId") REFERENCES "TrainingProgram" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_VolunteerQualification" ("createdAt", "earnedAt", "expiresAt", "fileUrl", "id", "issuer", "memberId", "programId", "title") SELECT "createdAt", "earnedAt", "expiresAt", "fileUrl", "id", "issuer", "memberId", "programId", "title" FROM "VolunteerQualification";
DROP TABLE "VolunteerQualification";
ALTER TABLE "new_VolunteerQualification" RENAME TO "VolunteerQualification";
CREATE INDEX "VolunteerQualification_memberId_idx" ON "VolunteerQualification"("memberId");
CREATE INDEX "VolunteerQualification_expiresAt_idx" ON "VolunteerQualification"("expiresAt");
CREATE INDEX "VolunteerQualification_programId_idx" ON "VolunteerQualification"("programId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "GovernanceAppointment_positionId_idx" ON "GovernanceAppointment"("positionId");

-- CreateIndex
CREATE INDEX "GovernanceAppointment_memberId_idx" ON "GovernanceAppointment"("memberId");

-- CreateIndex
CREATE INDEX "GovernanceAppointment_status_idx" ON "GovernanceAppointment"("status");

-- CreateIndex
CREATE INDEX "GovernanceAppointment_startAt_idx" ON "GovernanceAppointment"("startAt");

-- CreateIndex
CREATE INDEX "GovernanceAppointment_endAt_idx" ON "GovernanceAppointment"("endAt");

-- CreateIndex
CREATE INDEX "GovernanceAppointment_appointedById_idx" ON "GovernanceAppointment"("appointedById");

-- CreateIndex
CREATE UNIQUE INDEX "Committee_slug_key" ON "Committee"("slug");

-- CreateIndex
CREATE INDEX "Committee_ministryId_idx" ON "Committee"("ministryId");

-- CreateIndex
CREATE INDEX "Committee_status_idx" ON "Committee"("status");

-- CreateIndex
CREATE INDEX "Committee_isActive_idx" ON "Committee"("isActive");

-- CreateIndex
CREATE INDEX "Committee_chairUserId_idx" ON "Committee"("chairUserId");

-- CreateIndex
CREATE INDEX "Committee_secretaryUserId_idx" ON "Committee"("secretaryUserId");

-- CreateIndex
CREATE INDEX "CommitteeMember_memberId_idx" ON "CommitteeMember"("memberId");

-- CreateIndex
CREATE INDEX "CommitteeMember_status_idx" ON "CommitteeMember"("status");

-- CreateIndex
CREATE INDEX "CommitteeMember_committeeId_status_idx" ON "CommitteeMember"("committeeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CommitteeMember_committeeId_memberId_key" ON "CommitteeMember"("committeeId", "memberId");

-- CreateIndex
CREATE INDEX "GovernanceMeeting_committeeId_idx" ON "GovernanceMeeting"("committeeId");

-- CreateIndex
CREATE INDEX "GovernanceMeeting_ministryId_idx" ON "GovernanceMeeting"("ministryId");

-- CreateIndex
CREATE INDEX "GovernanceMeeting_eventId_idx" ON "GovernanceMeeting"("eventId");

-- CreateIndex
CREATE INDEX "GovernanceMeeting_startsAt_idx" ON "GovernanceMeeting"("startsAt");

-- CreateIndex
CREATE INDEX "GovernanceMeeting_status_idx" ON "GovernanceMeeting"("status");

-- CreateIndex
CREATE INDEX "GovernanceMeeting_meetingType_idx" ON "GovernanceMeeting"("meetingType");

-- CreateIndex
CREATE INDEX "GovernanceMeeting_chairUserId_idx" ON "GovernanceMeeting"("chairUserId");

-- CreateIndex
CREATE INDEX "AgendaItem_meetingId_idx" ON "AgendaItem"("meetingId");

-- CreateIndex
CREATE INDEX "AgendaItem_meetingId_sortOrder_idx" ON "AgendaItem"("meetingId", "sortOrder");

-- CreateIndex
CREATE INDEX "AgendaItem_status_idx" ON "AgendaItem"("status");

-- CreateIndex
CREATE INDEX "MeetingParticipant_meetingId_idx" ON "MeetingParticipant"("meetingId");

-- CreateIndex
CREATE INDEX "MeetingParticipant_attendance_idx" ON "MeetingParticipant"("attendance");

-- CreateIndex
CREATE UNIQUE INDEX "MeetingParticipant_meetingId_memberId_key" ON "MeetingParticipant"("meetingId", "memberId");

-- CreateIndex
CREATE UNIQUE INDEX "MeetingParticipant_meetingId_userId_key" ON "MeetingParticipant"("meetingId", "userId");

-- CreateIndex
CREATE INDEX "MeetingMinute_meetingId_idx" ON "MeetingMinute"("meetingId");

-- CreateIndex
CREATE INDEX "MeetingMinute_status_idx" ON "MeetingMinute"("status");

-- CreateIndex
CREATE INDEX "MeetingMinute_authorId_idx" ON "MeetingMinute"("authorId");

-- CreateIndex
CREATE UNIQUE INDEX "MeetingMinute_meetingId_version_key" ON "MeetingMinute"("meetingId", "version");

-- CreateIndex
CREATE INDEX "GovernanceDecision_meetingId_idx" ON "GovernanceDecision"("meetingId");

-- CreateIndex
CREATE INDEX "GovernanceDecision_committeeId_idx" ON "GovernanceDecision"("committeeId");

-- CreateIndex
CREATE INDEX "GovernanceDecision_status_idx" ON "GovernanceDecision"("status");

-- CreateIndex
CREATE INDEX "GovernanceDecision_decisionDate_idx" ON "GovernanceDecision"("decisionDate");

-- CreateIndex
CREATE UNIQUE INDEX "Resolution_resolutionNumber_key" ON "Resolution"("resolutionNumber");

-- CreateIndex
CREATE INDEX "Resolution_meetingId_idx" ON "Resolution"("meetingId");

-- CreateIndex
CREATE INDEX "Resolution_status_idx" ON "Resolution"("status");

-- CreateIndex
CREATE INDEX "Resolution_decidedAt_idx" ON "Resolution"("decidedAt");

-- CreateIndex
CREATE INDEX "GovernanceVote_meetingId_idx" ON "GovernanceVote"("meetingId");

-- CreateIndex
CREATE INDEX "GovernanceVote_resolutionId_idx" ON "GovernanceVote"("resolutionId");

-- CreateIndex
CREATE INDEX "GovernanceVote_voterUserId_idx" ON "GovernanceVote"("voterUserId");

-- CreateIndex
CREATE UNIQUE INDEX "GovernanceVote_meetingId_resolutionId_voterUserId_key" ON "GovernanceVote"("meetingId", "resolutionId", "voterUserId");

-- CreateIndex
CREATE UNIQUE INDEX "GovernanceActionItem_volunteerTaskId_key" ON "GovernanceActionItem"("volunteerTaskId");

-- CreateIndex
CREATE INDEX "GovernanceActionItem_meetingId_idx" ON "GovernanceActionItem"("meetingId");

-- CreateIndex
CREATE INDEX "GovernanceActionItem_committeeId_idx" ON "GovernanceActionItem"("committeeId");

-- CreateIndex
CREATE INDEX "GovernanceActionItem_assigneeUserId_idx" ON "GovernanceActionItem"("assigneeUserId");

-- CreateIndex
CREATE INDEX "GovernanceActionItem_status_idx" ON "GovernanceActionItem"("status");

-- CreateIndex
CREATE INDEX "GovernanceActionItem_dueAt_idx" ON "GovernanceActionItem"("dueAt");

-- CreateIndex
CREATE UNIQUE INDEX "GovernancePolicy_slug_key" ON "GovernancePolicy"("slug");

-- CreateIndex
CREATE INDEX "GovernancePolicy_committeeId_idx" ON "GovernancePolicy"("committeeId");

-- CreateIndex
CREATE INDEX "GovernancePolicy_status_idx" ON "GovernancePolicy"("status");

-- CreateIndex
CREATE INDEX "GovernancePolicy_authorId_idx" ON "GovernancePolicy"("authorId");

-- CreateIndex
CREATE INDEX "PolicyVersion_policyId_idx" ON "PolicyVersion"("policyId");

-- CreateIndex
CREATE INDEX "PolicyVersion_status_idx" ON "PolicyVersion"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PolicyVersion_policyId_version_key" ON "PolicyVersion"("policyId", "version");

-- CreateIndex
CREATE INDEX "PolicyAcknowledgement_memberId_idx" ON "PolicyAcknowledgement"("memberId");

-- CreateIndex
CREATE INDEX "PolicyAcknowledgement_userId_idx" ON "PolicyAcknowledgement"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PolicyAcknowledgement_policyVersionId_userId_key" ON "PolicyAcknowledgement"("policyVersionId", "userId");

-- CreateIndex
CREATE INDEX "GovernanceDocument_committeeId_idx" ON "GovernanceDocument"("committeeId");

-- CreateIndex
CREATE INDEX "GovernanceDocument_policyId_idx" ON "GovernanceDocument"("policyId");

-- CreateIndex
CREATE INDEX "GovernanceDocument_resolutionId_idx" ON "GovernanceDocument"("resolutionId");

-- CreateIndex
CREATE INDEX "GovernanceDocument_accessLevel_idx" ON "GovernanceDocument"("accessLevel");

-- CreateIndex
CREATE INDEX "GovernanceDocument_meetingId_idx" ON "GovernanceDocument"("meetingId");

-- CreateIndex
CREATE UNIQUE INDEX "AdminRequestCategory_slug_key" ON "AdminRequestCategory"("slug");

-- CreateIndex
CREATE INDEX "AdminRequestCategory_isActive_idx" ON "AdminRequestCategory"("isActive");

-- CreateIndex
CREATE INDEX "AdministrativeRequest_categoryId_idx" ON "AdministrativeRequest"("categoryId");

-- CreateIndex
CREATE INDEX "AdministrativeRequest_memberId_idx" ON "AdministrativeRequest"("memberId");

-- CreateIndex
CREATE INDEX "AdministrativeRequest_status_idx" ON "AdministrativeRequest"("status");

-- CreateIndex
CREATE INDEX "AdministrativeRequest_assigneeUserId_idx" ON "AdministrativeRequest"("assigneeUserId");

-- CreateIndex
CREATE INDEX "AdministrativeRequest_priority_idx" ON "AdministrativeRequest"("priority");

-- CreateIndex
CREATE INDEX "AdminRequestNote_requestId_idx" ON "AdminRequestNote"("requestId");

-- CreateIndex
CREATE INDEX "AdminRequestNote_authorId_idx" ON "AdminRequestNote"("authorId");

-- CreateIndex
CREATE INDEX "AdminRequestNote_isInternal_idx" ON "AdminRequestNote"("isInternal");

-- CreateIndex
CREATE INDEX "ApprovalWorkflow_entityType_idx" ON "ApprovalWorkflow"("entityType");

-- CreateIndex
CREATE INDEX "ApprovalWorkflow_isActive_idx" ON "ApprovalWorkflow"("isActive");

-- CreateIndex
CREATE INDEX "ApprovalStep_workflowId_idx" ON "ApprovalStep"("workflowId");

-- CreateIndex
CREATE INDEX "ApprovalStep_workflowId_sortOrder_idx" ON "ApprovalStep"("workflowId", "sortOrder");

-- CreateIndex
CREATE INDEX "ApprovalAction_workflowId_idx" ON "ApprovalAction"("workflowId");

-- CreateIndex
CREATE INDEX "ApprovalAction_entityType_entityId_idx" ON "ApprovalAction"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "ApprovalAction_actorId_idx" ON "ApprovalAction"("actorId");

-- CreateIndex
CREATE INDEX "ApprovalAction_createdAt_idx" ON "ApprovalAction"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalAction_entityType_entityId_stepId_actorId_action_key" ON "ApprovalAction"("entityType", "entityId", "stepId", "actorId", "action");

-- CreateIndex
CREATE INDEX "ApprovalDelegation_fromUserId_idx" ON "ApprovalDelegation"("fromUserId");

-- CreateIndex
CREATE INDEX "ApprovalDelegation_toUserId_idx" ON "ApprovalDelegation"("toUserId");

-- CreateIndex
CREATE INDEX "ApprovalDelegation_isActive_idx" ON "ApprovalDelegation"("isActive");

-- CreateIndex
CREATE INDEX "ApprovalDelegation_startAt_endAt_idx" ON "ApprovalDelegation"("startAt", "endAt");

-- CreateIndex
CREATE UNIQUE INDEX "GovernanceSetting_key_key" ON "GovernanceSetting"("key");
