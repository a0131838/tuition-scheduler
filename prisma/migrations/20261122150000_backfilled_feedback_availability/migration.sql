-- Existing rows stay NULL unless an immutable creation audit proves their creation time.
-- Adding the default separately prevents migration time becoming a false legacy creation time.
ALTER TABLE "Session" ADD COLUMN "feedbackAvailableAt" TIMESTAMP(3);
ALTER TABLE "Session" ALTER COLUMN "feedbackAvailableAt" SET DEFAULT CURRENT_TIMESTAMP;

WITH created AS (
  SELECT "entityId", MIN("createdAt") AS "availableAt"
  FROM "AuditLog"
  WHERE "module" = 'SCHEDULING' AND "entityType" = 'Session'
    AND "action" IN ('SESSION_CREATED', 'MINIAPP_SESSION_CREATE')
  GROUP BY "entityId"
)
UPDATE "Session" AS s SET "feedbackAvailableAt" = c."availableAt"
FROM created c WHERE c."entityId" = s."id" AND c."availableAt" > s."endAt";
