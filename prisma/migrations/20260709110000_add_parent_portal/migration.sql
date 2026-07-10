CREATE TABLE "ParentAccount" (
  "id" TEXT NOT NULL,
  "name" TEXT,
  "phone" TEXT,
  "phoneCountry" TEXT,
  "wechatOpenId" TEXT,
  "wechatUnionId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ParentAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ParentAccount_wechatOpenId_key" ON "ParentAccount"("wechatOpenId");
CREATE INDEX "ParentAccount_phone_idx" ON "ParentAccount"("phone");
CREATE INDEX "ParentAccount_wechatUnionId_idx" ON "ParentAccount"("wechatUnionId");
CREATE INDEX "ParentAccount_status_createdAt_idx" ON "ParentAccount"("status", "createdAt");

CREATE TABLE "ParentStudentLink" (
  "id" TEXT NOT NULL,
  "parentId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "relationship" TEXT,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "canViewSchedule" BOOLEAN NOT NULL DEFAULT true,
  "canViewFeedback" BOOLEAN NOT NULL DEFAULT true,
  "canViewFinance" BOOLEAN NOT NULL DEFAULT true,
  "canViewReports" BOOLEAN NOT NULL DEFAULT true,
  "canCreateRequests" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ParentStudentLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ParentStudentLink_parentId_studentId_key" ON "ParentStudentLink"("parentId", "studentId");
CREATE INDEX "ParentStudentLink_studentId_idx" ON "ParentStudentLink"("studentId");
CREATE INDEX "ParentStudentLink_parentId_idx" ON "ParentStudentLink"("parentId");

CREATE TABLE "ParentPortalSession" (
  "id" TEXT NOT NULL,
  "parentId" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ParentPortalSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ParentPortalSession_token_key" ON "ParentPortalSession"("token");
CREATE INDEX "ParentPortalSession_parentId_idx" ON "ParentPortalSession"("parentId");
CREATE INDEX "ParentPortalSession_expiresAt_idx" ON "ParentPortalSession"("expiresAt");

CREATE TABLE "ParentBindInvite" (
  "id" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "createdBy" TEXT,
  "expiresAt" TIMESTAMP(3),
  "usedAt" TIMESTAMP(3),
  "usedById" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ParentBindInvite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ParentBindInvite_token_key" ON "ParentBindInvite"("token");
CREATE INDEX "ParentBindInvite_studentId_isActive_idx" ON "ParentBindInvite"("studentId", "isActive");
CREATE INDEX "ParentBindInvite_usedById_idx" ON "ParentBindInvite"("usedById");

CREATE TABLE "ParentPortalAudit" (
  "id" TEXT NOT NULL,
  "parentId" TEXT,
  "studentId" TEXT,
  "action" TEXT NOT NULL,
  "targetType" TEXT,
  "targetId" TEXT,
  "metaJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ParentPortalAudit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ParentPortalAudit_parentId_createdAt_idx" ON "ParentPortalAudit"("parentId", "createdAt");
CREATE INDEX "ParentPortalAudit_studentId_createdAt_idx" ON "ParentPortalAudit"("studentId", "createdAt");
CREATE INDEX "ParentPortalAudit_action_createdAt_idx" ON "ParentPortalAudit"("action", "createdAt");
CREATE INDEX "ParentPortalAudit_targetType_targetId_idx" ON "ParentPortalAudit"("targetType", "targetId");

ALTER TABLE "ParentStudentLink" ADD CONSTRAINT "ParentStudentLink_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ParentAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ParentStudentLink" ADD CONSTRAINT "ParentStudentLink_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ParentPortalSession" ADD CONSTRAINT "ParentPortalSession_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ParentAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ParentBindInvite" ADD CONSTRAINT "ParentBindInvite_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ParentPortalAudit" ADD CONSTRAINT "ParentPortalAudit_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ParentAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ParentPortalAudit" ADD CONSTRAINT "ParentPortalAudit_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;
