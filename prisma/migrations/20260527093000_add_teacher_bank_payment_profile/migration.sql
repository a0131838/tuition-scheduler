ALTER TABLE "Teacher" ADD COLUMN "paymentMethod" TEXT;
ALTER TABLE "Teacher" ADD COLUMN "bankName" TEXT;
ALTER TABLE "Teacher" ADD COLUMN "bankAccountName" TEXT;
ALTER TABLE "Teacher" ADD COLUMN "bankAccountNumber" TEXT;
ALTER TABLE "Teacher" ADD COLUMN "bankBranchCode" TEXT;

UPDATE "Teacher"
SET "paymentMethod" = 'PAYNOW'
WHERE "paymentMethod" IS NULL
  AND (
    "payNowType" IS NOT NULL
    OR "payNowValue" IS NOT NULL
    OR "payNowName" IS NOT NULL
  );
