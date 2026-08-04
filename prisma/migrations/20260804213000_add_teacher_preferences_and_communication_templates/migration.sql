ALTER TABLE "MonthlySchedulingItem"
  ADD COLUMN "preferredTeacherId" TEXT,
  ADD COLUMN "teacherPreferenceType" TEXT,
  ADD COLUMN "teacherPreferenceNote" TEXT;

CREATE INDEX "MonthlySchedulingItem_preferredTeacherId_campaignId_idx"
  ON "MonthlySchedulingItem"("preferredTeacherId", "campaignId");

ALTER TABLE "ParentCommunicationTask"
  ADD COLUMN "templateCode" TEXT,
  ADD COLUMN "templateVersion" INTEGER,
  ADD COLUMN "templateVariables" JSONB;

CREATE INDEX "ParentCommunicationTask_templateCode_templateVersion_idx"
  ON "ParentCommunicationTask"("templateCode", "templateVersion");

CREATE TABLE "ParentCommunicationTemplate" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "category" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "audience" TEXT NOT NULL DEFAULT 'PARENT',
  "channel" TEXT NOT NULL DEFAULT 'WECHAT_GROUP',
  "language" TEXT NOT NULL DEFAULT 'BILINGUAL',
  "content" TEXT NOT NULL,
  "variableKeys" JSONB,
  "editPolicy" TEXT NOT NULL DEFAULT 'LOCKED',
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "isSystem" BOOLEAN NOT NULL DEFAULT true,
  "createdByUserId" TEXT,
  "createdByName" TEXT,
  "approvedByUserId" TEXT,
  "approvedByName" TEXT,
  "publishedAt" TIMESTAMP(3),
  "retiredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ParentCommunicationTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ParentCommunicationTemplate_code_version_key"
  ON "ParentCommunicationTemplate"("code", "version");
CREATE INDEX "ParentCommunicationTemplate_status_category_code_idx"
  ON "ParentCommunicationTemplate"("status", "category", "code");
CREATE INDEX "ParentCommunicationTemplate_code_status_version_idx"
  ON "ParentCommunicationTemplate"("code", "status", "version");
