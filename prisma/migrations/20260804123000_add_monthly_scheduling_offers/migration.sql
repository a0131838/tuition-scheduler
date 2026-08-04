CREATE TABLE "MonthlySchedulingOffer" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "weekdayLabel" TEXT NOT NULL,
    "startMin" INTEGER NOT NULL,
    "endMin" INTEGER NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "sessionDatesJson" JSONB NOT NULL,
    "parentRank" INTEGER,
    "heldByParentId" TEXT,
    "holdExpiresAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlySchedulingOffer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MonthlySchedulingOffer_itemId_teacherId_weekdayLabel_startMin_endMin_key"
ON "MonthlySchedulingOffer"("itemId", "teacherId", "weekdayLabel", "startMin", "endMin");

CREATE INDEX "MonthlySchedulingOffer_itemId_status_parentRank_idx"
ON "MonthlySchedulingOffer"("itemId", "status", "parentRank");

CREATE INDEX "MonthlySchedulingOffer_teacherId_status_holdExpiresAt_idx"
ON "MonthlySchedulingOffer"("teacherId", "status", "holdExpiresAt");

ALTER TABLE "MonthlySchedulingOffer"
ADD CONSTRAINT "MonthlySchedulingOffer_itemId_fkey"
FOREIGN KEY ("itemId") REFERENCES "MonthlySchedulingItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MonthlySchedulingOffer"
ADD CONSTRAINT "MonthlySchedulingOffer_teacherId_fkey"
FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
