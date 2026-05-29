ALTER TABLE "Teacher" ADD COLUMN "wiseAccountName" TEXT;
ALTER TABLE "Teacher" ADD COLUMN "wiseEmail" TEXT;
ALTER TABLE "Teacher" ADD COLUMN "wisePhone" TEXT;
ALTER TABLE "Teacher" ADD COLUMN "wiseTag" TEXT;
ALTER TABLE "Teacher" ADD COLUMN "wiseCountry" TEXT;
ALTER TABLE "Teacher" ADD COLUMN "wiseCurrency" TEXT;
ALTER TABLE "Teacher" ADD COLUMN "wiseNote" TEXT;
ALTER TABLE "Teacher" ADD COLUMN "paymentProfileStatus" TEXT;
ALTER TABLE "Teacher" ADD COLUMN "paymentProfileVerifiedAt" TIMESTAMP(3);
ALTER TABLE "Teacher" ADD COLUMN "paymentProfileVerifiedBy" TEXT;
ALTER TABLE "Teacher" ADD COLUMN "paymentProfileRejectReason" TEXT;

UPDATE "Teacher"
SET "paymentProfileStatus" = 'PENDING_REVIEW'
WHERE "paymentProfileStatus" IS NULL
  AND "paymentMethod" IS NOT NULL;
