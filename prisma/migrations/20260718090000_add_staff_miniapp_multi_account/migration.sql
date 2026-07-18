ALTER TABLE "StaffMiniappSession"
ADD COLUMN "wechatOpenId" TEXT;

DROP INDEX "StaffMiniappBinding_wechatOpenId_key";

CREATE UNIQUE INDEX "StaffMiniappBinding_wechatOpenId_userId_key"
ON "StaffMiniappBinding"("wechatOpenId", "userId");

CREATE INDEX "StaffMiniappBinding_wechatOpenId_status_idx"
ON "StaffMiniappBinding"("wechatOpenId", "status");

CREATE INDEX "StaffMiniappSession_wechatOpenId_idx"
ON "StaffMiniappSession"("wechatOpenId");
