CREATE TABLE "AppSetting" (
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("key")
);

CREATE TABLE "SignInAlert" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "alertType" TEXT NOT NULL,
  "targetRole" TEXT NOT NULL,
  "targetUserId" TEXT,
  "studentId" TEXT,
  "scopeKey" TEXT NOT NULL,
  "thresholdMin" INTEGER NOT NULL,
  "firstTriggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastTriggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SignInAlert_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SignInAlert_sessionId_alertType_targetRole_scopeKey_key"
ON "SignInAlert"("sessionId", "alertType", "targetRole", "scopeKey");

CREATE INDEX "SignInAlert_targetRole_targetUserId_resolvedAt_lastTriggeredAt_idx"
ON "SignInAlert"("targetRole", "targetUserId", "resolvedAt", "lastTriggeredAt");

CREATE INDEX "SignInAlert_sessionId_resolvedAt_idx"
ON "SignInAlert"("sessionId", "resolvedAt");

ALTER TABLE "SignInAlert"
ADD CONSTRAINT "SignInAlert_sessionId_fkey"
FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

