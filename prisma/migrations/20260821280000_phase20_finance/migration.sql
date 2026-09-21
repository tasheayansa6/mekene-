-- Phase 20: Finance administration

CREATE TABLE "ExpenseCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "ExpenseCategory_slug_key" ON "ExpenseCategory"("slug");
CREATE INDEX "ExpenseCategory_isActive_idx" ON "ExpenseCategory"("isActive");
CREATE INDEX "ExpenseCategory_sortOrder_idx" ON "ExpenseCategory"("sortOrder");

CREATE TABLE "Expense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reference" TEXT NOT NULL,
    "categoryId" TEXT,
    "fundId" TEXT,
    "amount" DECIMAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ETB',
    "vendor" TEXT,
    "description" TEXT NOT NULL,
    "expenseDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "submittedById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "reviewedAt" DATETIME,
    "paidAt" DATETIME,
    "rejectionReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Expense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ExpenseCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Expense_fundId_fkey" FOREIGN KEY ("fundId") REFERENCES "DonationCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Expense_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Expense_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Expense_reference_key" ON "Expense"("reference");
CREATE INDEX "Expense_status_idx" ON "Expense"("status");
CREATE INDEX "Expense_expenseDate_idx" ON "Expense"("expenseDate");
CREATE INDEX "Expense_categoryId_idx" ON "Expense"("categoryId");
CREATE INDEX "Expense_fundId_idx" ON "Expense"("fundId");
CREATE INDEX "Expense_submittedById_idx" ON "Expense"("submittedById");
CREATE INDEX "Expense_createdAt_idx" ON "Expense"("createdAt");

CREATE TABLE "ExpenseDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "expenseId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT,
    "fileMime" TEXT,
    "fileSize" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExpenseDocument_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ExpenseDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "ExpenseDocument_expenseId_idx" ON "ExpenseDocument"("expenseId");
CREATE INDEX "ExpenseDocument_createdAt_idx" ON "ExpenseDocument"("createdAt");

CREATE TABLE "Budget" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "fundId" TEXT,
    "expenseCategoryId" TEXT,
    "period" TEXT NOT NULL DEFAULT 'annual',
    "periodStart" DATETIME NOT NULL,
    "periodEnd" DATETIME NOT NULL,
    "allocatedAmount" DECIMAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ETB',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Budget_fundId_fkey" FOREIGN KEY ("fundId") REFERENCES "DonationCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Budget_expenseCategoryId_fkey" FOREIGN KEY ("expenseCategoryId") REFERENCES "ExpenseCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Budget_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "Budget_status_idx" ON "Budget"("status");
CREATE INDEX "Budget_periodStart_idx" ON "Budget"("periodStart");
CREATE INDEX "Budget_periodEnd_idx" ON "Budget"("periodEnd");
CREATE INDEX "Budget_fundId_idx" ON "Budget"("fundId");
CREATE INDEX "Budget_expenseCategoryId_idx" ON "Budget"("expenseCategoryId");

CREATE TABLE "Reconciliation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "periodLabel" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "statementReference" TEXT,
    "openingBalance" DECIMAL NOT NULL DEFAULT 0,
    "closingBalance" DECIMAL NOT NULL DEFAULT 0,
    "expectedTotal" DECIMAL NOT NULL DEFAULT 0,
    "actualTotal" DECIMAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'open',
    "notes" TEXT,
    "reconciledById" TEXT,
    "reconciledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Reconciliation_reconciledById_fkey" FOREIGN KEY ("reconciledById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "Reconciliation_status_idx" ON "Reconciliation"("status");
CREATE INDEX "Reconciliation_createdAt_idx" ON "Reconciliation"("createdAt");

CREATE TABLE "ReconciliationMatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reconciliationId" TEXT NOT NULL,
    "contributionId" TEXT,
    "externalReference" TEXT,
    "amount" DECIMAL NOT NULL,
    "matchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    CONSTRAINT "ReconciliationMatch_reconciliationId_fkey" FOREIGN KEY ("reconciliationId") REFERENCES "Reconciliation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "ReconciliationMatch_reconciliationId_idx" ON "ReconciliationMatch"("reconciliationId");
CREATE INDEX "ReconciliationMatch_contributionId_idx" ON "ReconciliationMatch"("contributionId");

CREATE TABLE "FinancialEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'posted',
    "reference" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ETB',
    "entryDate" DATETIME NOT NULL,
    "fundId" TEXT,
    "contributionId" TEXT,
    "expenseId" TEXT,
    "description" TEXT,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FinancialEntry_fundId_fkey" FOREIGN KEY ("fundId") REFERENCES "DonationCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "FinancialEntry_contributionId_fkey" FOREIGN KEY ("contributionId") REFERENCES "Contribution" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "FinancialEntry_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "FinancialEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "FinancialEntry_reference_key" ON "FinancialEntry"("reference");
CREATE INDEX "FinancialEntry_type_idx" ON "FinancialEntry"("type");
CREATE INDEX "FinancialEntry_status_idx" ON "FinancialEntry"("status");
CREATE INDEX "FinancialEntry_entryDate_idx" ON "FinancialEntry"("entryDate");
CREATE INDEX "FinancialEntry_fundId_idx" ON "FinancialEntry"("fundId");
CREATE INDEX "FinancialEntry_contributionId_idx" ON "FinancialEntry"("contributionId");
CREATE INDEX "FinancialEntry_expenseId_idx" ON "FinancialEntry"("expenseId");
CREATE INDEX "FinancialEntry_createdAt_idx" ON "FinancialEntry"("createdAt");

CREATE TABLE "GivingSchedule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "fundId" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ETB',
    "frequency" TEXT NOT NULL DEFAULT 'monthly',
    "status" TEXT NOT NULL DEFAULT 'active',
    "provider" TEXT,
    "providerReference" TEXT,
    "nextPaymentAt" DATETIME,
    "lastContributionId" TEXT,
    "cancelledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GivingSchedule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GivingSchedule_fundId_fkey" FOREIGN KEY ("fundId") REFERENCES "DonationCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "GivingSchedule_lastContributionId_fkey" FOREIGN KEY ("lastContributionId") REFERENCES "Contribution" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "GivingSchedule_userId_idx" ON "GivingSchedule"("userId");
CREATE INDEX "GivingSchedule_fundId_idx" ON "GivingSchedule"("fundId");
CREATE INDEX "GivingSchedule_status_idx" ON "GivingSchedule"("status");
CREATE INDEX "GivingSchedule_nextPaymentAt_idx" ON "GivingSchedule"("nextPaymentAt");
