CREATE TYPE "ExpenseClaimStatus" AS ENUM ('SUBMITTED', 'APPROVED', 'REJECTED', 'PAID');

CREATE TABLE "ExpenseClaim" (
  "id" TEXT NOT NULL,
  "claimRefNo" TEXT NOT NULL,
  "submitterUserId" TEXT NOT NULL,
  "submitterName" TEXT NOT NULL,
  "submitterRole" TEXT NOT NULL,
  "expenseDate" TIMESTAMP(3) NOT NULL,
  "description" TEXT NOT NULL,
  "studentName" TEXT,
  "location" TEXT,
  "amountCents" INTEGER NOT NULL,
  "gstAmountCents" INTEGER,
  "currencyCode" TEXT NOT NULL DEFAULT 'SGD',
  "expenseTypeCode" TEXT NOT NULL,
  "accountCode" TEXT NOT NULL,
  "receiptPath" TEXT NOT NULL,
  "receiptOriginalName" TEXT NOT NULL,
  "status" "ExpenseClaimStatus" NOT NULL DEFAULT 'SUBMITTED',
  "approverEmail" TEXT,
  "approvedAt" TIMESTAMP(3),
  "rejectedAt" TIMESTAMP(3),
  "rejectReason" TEXT,
  "paidByEmail" TEXT,
  "paidAt" TIMESTAMP(3),
  "paymentBatchMonth" TEXT,
  "remarks" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ExpenseClaim_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ExpenseClaim_claimRefNo_key" ON "ExpenseClaim"("claimRefNo");
CREATE INDEX "ExpenseClaim_submitterUserId_createdAt_idx" ON "ExpenseClaim"("submitterUserId", "createdAt");
CREATE INDEX "ExpenseClaim_status_expenseDate_idx" ON "ExpenseClaim"("status", "expenseDate");
CREATE INDEX "ExpenseClaim_paymentBatchMonth_status_idx" ON "ExpenseClaim"("paymentBatchMonth", "status");
CREATE INDEX "ExpenseClaim_expenseTypeCode_expenseDate_idx" ON "ExpenseClaim"("expenseTypeCode", "expenseDate");

ALTER TABLE "ExpenseClaim"
  ADD CONSTRAINT "ExpenseClaim_submitterUserId_fkey"
  FOREIGN KEY ("submitterUserId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
