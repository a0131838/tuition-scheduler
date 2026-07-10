-- CreateTable
CREATE TABLE "MiniappNotificationOutbox" (
    "id" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "studentId" TEXT,
    "openId" TEXT,
    "templateKey" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "payloadJson" JSONB,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "scheduledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MiniappNotificationOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MiniappNotificationOutbox_status_scheduledAt_idx" ON "MiniappNotificationOutbox"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "MiniappNotificationOutbox_parentId_createdAt_idx" ON "MiniappNotificationOutbox"("parentId", "createdAt");

-- CreateIndex
CREATE INDEX "MiniappNotificationOutbox_studentId_createdAt_idx" ON "MiniappNotificationOutbox"("studentId", "createdAt");

-- CreateIndex
CREATE INDEX "MiniappNotificationOutbox_templateKey_createdAt_idx" ON "MiniappNotificationOutbox"("templateKey", "createdAt");

-- CreateIndex
CREATE INDEX "MiniappNotificationOutbox_targetType_targetId_idx" ON "MiniappNotificationOutbox"("targetType", "targetId");

-- CreateIndex
CREATE UNIQUE INDEX "MiniappNotificationOutbox_parentId_templateKey_targetType_targetId_key" ON "MiniappNotificationOutbox"("parentId", "templateKey", "targetType", "targetId");

-- AddForeignKey
ALTER TABLE "MiniappNotificationOutbox" ADD CONSTRAINT "MiniappNotificationOutbox_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ParentAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MiniappNotificationOutbox" ADD CONSTRAINT "MiniappNotificationOutbox_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;
