ALTER TABLE "Lead"
ADD COLUMN "isArchived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "archivedAt" TIMESTAMP(3),
ADD COLUMN "archivedByName" TEXT;

CREATE INDEX "Lead_isArchived_createdAt_idx" ON "Lead"("isArchived", "createdAt");

CREATE TABLE "LeadResourceOwner" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT,
  "note" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LeadResourceOwner_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LeadResourceOwner_name_key" ON "LeadResourceOwner"("name");
CREATE INDEX "LeadResourceOwner_isActive_name_idx" ON "LeadResourceOwner"("isActive", "name");

INSERT INTO "LeadResourceOwner" ("id", "name", "email", "note", "isActive", "createdAt", "updatedAt")
SELECT 'owner-user-' || md5(u."id"), u."name", u."email", 'Seeded from existing ADMIN user', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "User" u
WHERE u."role" = 'ADMIN'
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "LeadResourceOwner" ("id", "name", "email", "note", "isActive", "createdAt", "updatedAt")
SELECT 'owner-lead-' || md5(l."ownerName"), l."ownerName", NULL, 'Seeded from existing resource owner', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Lead" l
WHERE l."ownerName" IS NOT NULL AND trim(l."ownerName") <> ''
ON CONFLICT ("name") DO NOTHING;
