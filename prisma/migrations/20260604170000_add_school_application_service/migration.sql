CREATE TYPE "SchoolApplicationStatus" AS ENUM ('DRAFT', 'READY_TO_SIGN', 'SIGNED', 'INVOICE_CREATED', 'VOID');

CREATE TYPE "SchoolApplicationEventType" AS ENUM ('GENERATED', 'DRAFT_SAVED', 'SIGN_READY', 'SIGN_VIEWED', 'SIGNED', 'INVOICE_CREATED', 'VOIDED');

CREATE TABLE "SchoolApplicationService" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "packageId" TEXT,
  "status" "SchoolApplicationStatus" NOT NULL DEFAULT 'DRAFT',
  "signToken" TEXT,
  "signExpiresAt" TIMESTAMP(3),
  "signViewedAt" TIMESTAMP(3),
  "signedAt" TIMESTAMP(3),
  "invoiceCreatedAt" TIMESTAMP(3),
  "voidedAt" TIMESTAMP(3),
  "parentInfoJson" JSONB,
  "applicationItemsJson" JSONB NOT NULL,
  "addOnItemsJson" JSONB,
  "officialFeesJson" JSONB,
  "serviceHours" DECIMAL(10,2),
  "serviceFeeAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "officialFeeAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "addOnFeeAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "totalAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "billTo" TEXT NOT NULL,
  "agreementDate" TIMESTAMP(3) NOT NULL,
  "note" TEXT,
  "contractSnapshotJson" JSONB,
  "signedPdfPath" TEXT,
  "signatureImagePath" TEXT,
  "signerName" TEXT,
  "signerEmail" TEXT,
  "signerPhone" TEXT,
  "signerIp" TEXT,
  "invoiceId" TEXT,
  "invoiceNo" TEXT,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SchoolApplicationService_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SchoolApplicationEvent" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "eventType" "SchoolApplicationEventType" NOT NULL,
  "actorType" TEXT NOT NULL,
  "actorUserId" TEXT,
  "actorLabel" TEXT,
  "payloadJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SchoolApplicationEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SchoolApplicationService_signToken_key" ON "SchoolApplicationService"("signToken");
CREATE INDEX "SchoolApplicationService_studentId_status_createdAt_idx" ON "SchoolApplicationService"("studentId", "status", "createdAt");
CREATE INDEX "SchoolApplicationService_packageId_status_createdAt_idx" ON "SchoolApplicationService"("packageId", "status", "createdAt");
CREATE INDEX "SchoolApplicationService_status_createdAt_idx" ON "SchoolApplicationService"("status", "createdAt");
CREATE INDEX "SchoolApplicationService_invoiceId_idx" ON "SchoolApplicationService"("invoiceId");
CREATE INDEX "SchoolApplicationEvent_applicationId_createdAt_idx" ON "SchoolApplicationEvent"("applicationId", "createdAt");
CREATE INDEX "SchoolApplicationEvent_eventType_createdAt_idx" ON "SchoolApplicationEvent"("eventType", "createdAt");

ALTER TABLE "SchoolApplicationService"
ADD CONSTRAINT "SchoolApplicationService_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SchoolApplicationService"
ADD CONSTRAINT "SchoolApplicationService_packageId_fkey"
FOREIGN KEY ("packageId") REFERENCES "CoursePackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SchoolApplicationService"
ADD CONSTRAINT "SchoolApplicationService_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SchoolApplicationEvent"
ADD CONSTRAINT "SchoolApplicationEvent_applicationId_fkey"
FOREIGN KEY ("applicationId") REFERENCES "SchoolApplicationService"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SchoolApplicationEvent"
ADD CONSTRAINT "SchoolApplicationEvent_actorUserId_fkey"
FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
