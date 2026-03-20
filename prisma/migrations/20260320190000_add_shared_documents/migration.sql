-- CreateEnum
CREATE TYPE "SharedDocumentStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateTable
CREATE TABLE "DocumentCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SharedDocument" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "status" "SharedDocumentStatus" NOT NULL DEFAULT 'ACTIVE',
    "filePath" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "fileSizeBytes" INTEGER NOT NULL,
    "mimeType" TEXT,
    "remarks" TEXT,
    "uploadedByUserId" TEXT NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "archivedByEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SharedDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SharedDocumentAudit" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SharedDocumentAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DocumentCategory_name_key" ON "DocumentCategory"("name");

-- CreateIndex
CREATE INDEX "SharedDocument_categoryId_status_createdAt_idx" ON "SharedDocument"("categoryId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "SharedDocument_uploadedByUserId_createdAt_idx" ON "SharedDocument"("uploadedByUserId", "createdAt");

-- CreateIndex
CREATE INDEX "SharedDocument_status_createdAt_idx" ON "SharedDocument"("status", "createdAt");

-- CreateIndex
CREATE INDEX "SharedDocumentAudit_documentId_createdAt_idx" ON "SharedDocumentAudit"("documentId", "createdAt");

-- CreateIndex
CREATE INDEX "SharedDocumentAudit_actorUserId_createdAt_idx" ON "SharedDocumentAudit"("actorUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "SharedDocument" ADD CONSTRAINT "SharedDocument_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "DocumentCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedDocument" ADD CONSTRAINT "SharedDocument_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedDocumentAudit" ADD CONSTRAINT "SharedDocumentAudit_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "SharedDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedDocumentAudit" ADD CONSTRAINT "SharedDocumentAudit_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
