-- Create Partner configuration table for multi-partner settlement.
CREATE TABLE "Partner" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "sourceChannelId" TEXT NOT NULL,
  "billTo" TEXT NOT NULL,
  "invoiceDisplayName" TEXT,
  "onlineRatePer45" INTEGER NOT NULL DEFAULT 70,
  "offlineRatePer45" INTEGER NOT NULL DEFAULT 90,
  "lessonMinutes" INTEGER NOT NULL DEFAULT 45,
  "defaultPackageMinutes" INTEGER NOT NULL DEFAULT 450,
  "defaultTopUpMinutes" INTEGER NOT NULL DEFAULT 270,
  "supportsOnlineSettlement" BOOLEAN NOT NULL DEFAULT true,
  "supportsOfflineMonthly" BOOLEAN NOT NULL DEFAULT true,
  "intakeEnabled" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Partner_name_key" ON "Partner"("name");
CREATE UNIQUE INDEX "Partner_sourceChannelId_key" ON "Partner"("sourceChannelId");
CREATE INDEX "Partner_isActive_name_idx" ON "Partner"("isActive", "name");

ALTER TABLE "PartnerSettlement" ADD COLUMN "partnerId" TEXT;
CREATE INDEX "PartnerSettlement_partnerId_mode_status_createdAt_idx" ON "PartnerSettlement"("partnerId", "mode", "status", "createdAt");

-- Seed the legacy New Oriental partner and the new Shanghai Xin Zhuo Si partner.
INSERT INTO "StudentSourceChannel" ("id", "name", "isActive", "createdAt", "updatedAt")
VALUES ('legacy-xdf-source-channel', '新东方学生', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO UPDATE SET "isActive" = true, "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "StudentSourceChannel" ("id", "name", "isActive", "createdAt", "updatedAt")
VALUES ('shanghai-xzs-source-channel', '上海新卓思学生', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO UPDATE SET "isActive" = true, "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "Partner" (
  "id", "name", "sourceChannelId", "billTo", "invoiceDisplayName",
  "onlineRatePer45", "offlineRatePer45", "lessonMinutes",
  "defaultPackageMinutes", "defaultTopUpMinutes",
  "supportsOnlineSettlement", "supportsOfflineMonthly", "intakeEnabled", "isActive",
  "createdAt", "updatedAt"
)
SELECT
  'legacy-xdf-partner', '新东方', s."id", '北京新东方前途出国咨询有限公司', '新东方',
  COALESCE((SELECT NULLIF("value", '')::INTEGER FROM "AppSetting" WHERE "key" = 'partner_settlement_online_rate_per_45' AND "value" ~ '^[0-9]+$'), 70),
  COALESCE((SELECT NULLIF("value", '')::INTEGER FROM "AppSetting" WHERE "key" = 'partner_settlement_offline_rate_per_45' AND "value" ~ '^[0-9]+$'), 90),
  45, 450, 270, true, true, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "StudentSourceChannel" s
WHERE s."name" = '新东方学生'
ON CONFLICT ("name") DO UPDATE SET
  "sourceChannelId" = EXCLUDED."sourceChannelId",
  "billTo" = EXCLUDED."billTo",
  "invoiceDisplayName" = EXCLUDED."invoiceDisplayName",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "Partner" (
  "id", "name", "sourceChannelId", "billTo", "invoiceDisplayName",
  "onlineRatePer45", "offlineRatePer45", "lessonMinutes",
  "defaultPackageMinutes", "defaultTopUpMinutes",
  "supportsOnlineSettlement", "supportsOfflineMonthly", "intakeEnabled", "isActive",
  "createdAt", "updatedAt"
)
SELECT
  'shanghai-xzs-partner', '上海新卓思', s."id", '上海新卓思', '上海新卓思',
  COALESCE((SELECT NULLIF("value", '')::INTEGER FROM "AppSetting" WHERE "key" = 'partner_settlement_online_rate_per_45' AND "value" ~ '^[0-9]+$'), 70),
  COALESCE((SELECT NULLIF("value", '')::INTEGER FROM "AppSetting" WHERE "key" = 'partner_settlement_offline_rate_per_45' AND "value" ~ '^[0-9]+$'), 90),
  45, 450, 270, true, true, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "StudentSourceChannel" s
WHERE s."name" = '上海新卓思学生'
ON CONFLICT ("name") DO UPDATE SET
  "sourceChannelId" = EXCLUDED."sourceChannelId",
  "billTo" = EXCLUDED."billTo",
  "invoiceDisplayName" = EXCLUDED."invoiceDisplayName",
  "updatedAt" = CURRENT_TIMESTAMP;

-- Backfill existing legacy New Oriental settlements without changing their amounts/status.
UPDATE "PartnerSettlement" ps
SET "partnerId" = p."id"
FROM "Partner" p
JOIN "Student" st ON st."sourceChannelId" = p."sourceChannelId"
WHERE ps."studentId" = st."id"
  AND ps."partnerId" IS NULL
  AND p."name" = '新东方';

ALTER TABLE "Partner" ADD CONSTRAINT "Partner_sourceChannelId_fkey" FOREIGN KEY ("sourceChannelId") REFERENCES "StudentSourceChannel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PartnerSettlement" ADD CONSTRAINT "PartnerSettlement_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;
