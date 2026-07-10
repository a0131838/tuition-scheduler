CREATE TABLE "StaffMiniappBinding" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "wechatOpenId" TEXT NOT NULL,
    "wechatUnionId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "boundAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffMiniappBinding_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StaffMiniappSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffMiniappSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StaffMiniappBindInvite" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdBy" TEXT,
    "expiresAt" TIMESTAMP(3),
    "usedAt" TIMESTAMP(3),
    "usedByOpenId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffMiniappBindInvite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StaffMiniappBinding_wechatOpenId_key" ON "StaffMiniappBinding"("wechatOpenId");
CREATE INDEX "StaffMiniappBinding_userId_status_idx" ON "StaffMiniappBinding"("userId", "status");
CREATE INDEX "StaffMiniappBinding_wechatUnionId_idx" ON "StaffMiniappBinding"("wechatUnionId");

CREATE UNIQUE INDEX "StaffMiniappSession_token_key" ON "StaffMiniappSession"("token");
CREATE INDEX "StaffMiniappSession_userId_idx" ON "StaffMiniappSession"("userId");
CREATE INDEX "StaffMiniappSession_expiresAt_idx" ON "StaffMiniappSession"("expiresAt");

CREATE UNIQUE INDEX "StaffMiniappBindInvite_token_key" ON "StaffMiniappBindInvite"("token");
CREATE INDEX "StaffMiniappBindInvite_userId_idx" ON "StaffMiniappBindInvite"("userId");
CREATE INDEX "StaffMiniappBindInvite_createdBy_idx" ON "StaffMiniappBindInvite"("createdBy");
CREATE INDEX "StaffMiniappBindInvite_isActive_createdAt_idx" ON "StaffMiniappBindInvite"("isActive", "createdAt");

ALTER TABLE "StaffMiniappBinding" ADD CONSTRAINT "StaffMiniappBinding_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StaffMiniappSession" ADD CONSTRAINT "StaffMiniappSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StaffMiniappBindInvite" ADD CONSTRAINT "StaffMiniappBindInvite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StaffMiniappBindInvite" ADD CONSTRAINT "StaffMiniappBindInvite_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
