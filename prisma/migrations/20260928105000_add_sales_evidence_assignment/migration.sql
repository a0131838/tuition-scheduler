-- CreateTable
CREATE TABLE "SalesEvidenceAssignment" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "relationshipId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "reviewNote" TEXT NOT NULL,
    "reviewedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesEvidenceAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SalesEvidenceAssignment_relationshipId_status_idx" ON "SalesEvidenceAssignment"("relationshipId", "status");

-- CreateIndex
CREATE INDEX "SalesEvidenceAssignment_leadId_status_idx" ON "SalesEvidenceAssignment"("leadId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "SalesEvidenceAssignment_kind_documentId_key" ON "SalesEvidenceAssignment"("kind", "documentId");

-- AddForeignKey
ALTER TABLE "SalesEvidenceAssignment" ADD CONSTRAINT "SalesEvidenceAssignment_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesEvidenceAssignment" ADD CONSTRAINT "SalesEvidenceAssignment_relationshipId_fkey" FOREIGN KEY ("relationshipId") REFERENCES "SalesRelationship"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

