ALTER TABLE "MonthlySchedulingItem"
ADD COLUMN "responseEntryMode" TEXT,
ADD COLUMN "responseChannel" TEXT,
ADD COLUMN "respondedByUserId" TEXT,
ADD COLUMN "respondedByName" TEXT,
ADD COLUMN "parentConfirmationNote" TEXT,
ADD COLUMN "parentConfirmedAt" TIMESTAMP(3),
ADD COLUMN "offerSelectionEntryMode" TEXT,
ADD COLUMN "offerSelectionChannel" TEXT,
ADD COLUMN "offerSelectedByUserId" TEXT,
ADD COLUMN "offerSelectedByName" TEXT,
ADD COLUMN "offerSelectionNote" TEXT,
ADD COLUMN "offerParentConfirmedAt" TIMESTAMP(3);

CREATE INDEX "MonthlySchedulingItem_responseEntryMode_updatedAt_idx"
ON "MonthlySchedulingItem"("responseEntryMode", "updatedAt");
