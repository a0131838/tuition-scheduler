ALTER TYPE "SchoolApplicationEventType" ADD VALUE IF NOT EXISTS 'PARENT_INFO_LINK_SENT';
ALTER TYPE "SchoolApplicationEventType" ADD VALUE IF NOT EXISTS 'PARENT_INFO_VIEWED';
ALTER TYPE "SchoolApplicationEventType" ADD VALUE IF NOT EXISTS 'PARENT_INFO_SUBMITTED';

ALTER TABLE "SchoolApplicationService"
  ADD COLUMN IF NOT EXISTS "parentInfoToken" TEXT,
  ADD COLUMN IF NOT EXISTS "parentInfoExpiresAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "parentInfoViewedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "parentInfoSubmittedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "SchoolApplicationService_parentInfoToken_key" ON "SchoolApplicationService"("parentInfoToken");
CREATE INDEX IF NOT EXISTS "SchoolApplicationService_parentInfoSubmittedAt_idx" ON "SchoolApplicationService"("parentInfoSubmittedAt");
