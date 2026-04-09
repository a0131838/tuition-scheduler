-- CreateTable
CREATE TABLE "ParentAvailabilityRequest" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "courseLabel" TEXT,
    "token" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "payloadJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParentAvailabilityRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ParentAvailabilityRequest_ticketId_key" ON "ParentAvailabilityRequest"("ticketId");

-- CreateIndex
CREATE UNIQUE INDEX "ParentAvailabilityRequest_token_key" ON "ParentAvailabilityRequest"("token");

-- CreateIndex
CREATE INDEX "ParentAvailabilityRequest_studentId_isActive_createdAt_idx" ON "ParentAvailabilityRequest"("studentId", "isActive", "createdAt");

-- CreateIndex
CREATE INDEX "ParentAvailabilityRequest_isActive_submittedAt_createdAt_idx" ON "ParentAvailabilityRequest"("isActive", "submittedAt", "createdAt");

-- AddForeignKey
ALTER TABLE "ParentAvailabilityRequest" ADD CONSTRAINT "ParentAvailabilityRequest_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentAvailabilityRequest" ADD CONSTRAINT "ParentAvailabilityRequest_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
