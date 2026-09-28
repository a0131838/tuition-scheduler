-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "recordKind" TEXT NOT NULL DEFAULT 'UNREVIEWED',
ADD COLUMN     "relationshipId" TEXT,
ADD COLUMN     "relationshipLinkedAt" TIMESTAMP(3),
ADD COLUMN     "relationshipReviewNote" TEXT;

-- CreateTable
CREATE TABLE "SalesRelationship" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "ownerName" TEXT,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "contactWechat" TEXT,
    "nextAction" TEXT,
    "nextActionDue" TIMESTAMP(3),
    "note" TEXT,
    "createdById" TEXT,
    "createdByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesRelationship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesRelationshipFollowUp" (
    "id" TEXT NOT NULL,
    "relationshipId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorName" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "nextAction" TEXT,
    "nextActionDue" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesRelationshipFollowUp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesRelationshipOpportunity" (
    "id" TEXT NOT NULL,
    "relationshipId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "ownerName" TEXT,
    "nextAction" TEXT,
    "nextActionDue" TIMESTAMP(3),
    "estimatedAmount" DECIMAL(12,2),
    "currency" TEXT NOT NULL DEFAULT 'SGD',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesRelationshipOpportunity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SalesRelationship_status_nextActionDue_idx" ON "SalesRelationship"("status", "nextActionDue");

-- CreateIndex
CREATE INDEX "SalesRelationship_ownerName_updatedAt_idx" ON "SalesRelationship"("ownerName", "updatedAt");

-- CreateIndex
CREATE INDEX "SalesRelationshipFollowUp_relationshipId_createdAt_idx" ON "SalesRelationshipFollowUp"("relationshipId", "createdAt");

-- CreateIndex
CREATE INDEX "SalesRelationshipOpportunity_relationshipId_status_idx" ON "SalesRelationshipOpportunity"("relationshipId", "status");

-- CreateIndex
CREATE INDEX "SalesRelationshipOpportunity_nextActionDue_idx" ON "SalesRelationshipOpportunity"("nextActionDue");

-- CreateIndex
CREATE INDEX "Lead_relationshipId_recordKind_idx" ON "Lead"("relationshipId", "recordKind");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_relationshipId_fkey" FOREIGN KEY ("relationshipId") REFERENCES "SalesRelationship"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesRelationshipFollowUp" ADD CONSTRAINT "SalesRelationshipFollowUp_relationshipId_fkey" FOREIGN KEY ("relationshipId") REFERENCES "SalesRelationship"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesRelationshipOpportunity" ADD CONSTRAINT "SalesRelationshipOpportunity_relationshipId_fkey" FOREIGN KEY ("relationshipId") REFERENCES "SalesRelationship"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

