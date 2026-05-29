CREATE TYPE "StaffWorkspace" AS ENUM ('SALES', 'CS');

CREATE TABLE "UserWorkspaceAccess" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "workspace" "StaffWorkspace" NOT NULL,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "UserWorkspaceAccess_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserWorkspaceAccess_userId_workspace_key" ON "UserWorkspaceAccess"("userId", "workspace");
CREATE INDEX "UserWorkspaceAccess_workspace_isActive_idx" ON "UserWorkspaceAccess"("workspace", "isActive");

ALTER TABLE "UserWorkspaceAccess"
  ADD CONSTRAINT "UserWorkspaceAccess_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "UserWorkspaceAccess" ("id", "userId", "workspace", "isDefault", "isActive", "note", "createdAt", "updatedAt")
SELECT 'uwa-' || md5("id" || ':CS'), "id", 'CS'::"StaffWorkspace", false, true, 'Initial CS workspace access for Eva admin account', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "User"
WHERE lower("email") = 'eva@123.com'
ON CONFLICT ("userId", "workspace") DO UPDATE SET "isActive" = true, "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "UserWorkspaceAccess" ("id", "userId", "workspace", "isDefault", "isActive", "note", "createdAt", "updatedAt")
SELECT 'uwa-' || md5("id" || ':SALES'), "id", 'SALES'::"StaffWorkspace", false, true, 'Initial Sales workspace access for admin account', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "User"
WHERE lower("email") IN ('jasmine@123.com', 'zhaohongwei0880@gmail.com')
ON CONFLICT ("userId", "workspace") DO UPDATE SET "isActive" = true, "updatedAt" = CURRENT_TIMESTAMP;
