-- CreateEnum
CREATE TYPE "StudentContractStatus" AS ENUM ('DRAFT', 'INFO_PENDING', 'INFO_SUBMITTED', 'READY_TO_SIGN', 'SIGNED', 'EXPIRED', 'VOID');

-- CreateEnum
CREATE TYPE "StudentContractEventType" AS ENUM ('GENERATED', 'INTAKE_SENT', 'INTAKE_VIEWED', 'INTAKE_SUBMITTED', 'SIGN_LINK_SENT', 'SIGN_VIEWED', 'SIGNED', 'RESENT', 'EXPIRED', 'VOIDED');

-- CreateTable
CREATE TABLE "ContractTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "languageMode" TEXT,
    "bodyHtml" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentContract" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "status" "StudentContractStatus" NOT NULL DEFAULT 'DRAFT',
    "intakeToken" TEXT NOT NULL,
    "signToken" TEXT,
    "intakeExpiresAt" TIMESTAMP(3),
    "signExpiresAt" TIMESTAMP(3),
    "intakeSubmittedAt" TIMESTAMP(3),
    "signViewedAt" TIMESTAMP(3),
    "signedAt" TIMESTAMP(3),
    "voidedAt" TIMESTAMP(3),
    "parentInfoJson" JSONB,
    "contractSnapshotJson" JSONB,
    "signedPdfPath" TEXT,
    "signatureImagePath" TEXT,
    "signerName" TEXT,
    "signerEmail" TEXT,
    "signerPhone" TEXT,
    "signerIp" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentContract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentContractEvent" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "eventType" "StudentContractEventType" NOT NULL,
    "actorType" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorLabel" TEXT,
    "payloadJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentContractEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContractTemplate_slug_version_key" ON "ContractTemplate"("slug", "version");

-- CreateIndex
CREATE INDEX "ContractTemplate_isActive_slug_idx" ON "ContractTemplate"("isActive", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "StudentContract_intakeToken_key" ON "StudentContract"("intakeToken");

-- CreateIndex
CREATE UNIQUE INDEX "StudentContract_signToken_key" ON "StudentContract"("signToken");

-- CreateIndex
CREATE INDEX "StudentContract_studentId_status_createdAt_idx" ON "StudentContract"("studentId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "StudentContract_packageId_status_createdAt_idx" ON "StudentContract"("packageId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "StudentContract_status_createdAt_idx" ON "StudentContract"("status", "createdAt");

-- CreateIndex
CREATE INDEX "StudentContractEvent_contractId_createdAt_idx" ON "StudentContractEvent"("contractId", "createdAt");

-- CreateIndex
CREATE INDEX "StudentContractEvent_eventType_createdAt_idx" ON "StudentContractEvent"("eventType", "createdAt");

-- AddForeignKey
ALTER TABLE "StudentContract" ADD CONSTRAINT "StudentContract_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentContract" ADD CONSTRAINT "StudentContract_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "CoursePackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentContract" ADD CONSTRAINT "StudentContract_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ContractTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentContract" ADD CONSTRAINT "StudentContract_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentContractEvent" ADD CONSTRAINT "StudentContractEvent_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "StudentContract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentContractEvent" ADD CONSTRAINT "StudentContractEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
