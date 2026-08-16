CREATE TABLE "OperationsAdminAcl" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperationsAdminAcl_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OperationsAdminAcl_email_key" ON "OperationsAdminAcl"("email");

-- Jessika keeps her existing teacher profile and gains teaching operations only.
-- Company finance, settlement, payroll, expense approval and billing remain blocked.
INSERT INTO "OperationsAdminAcl" ("id", "email", "isActive", "note", "updatedAt")
VALUES (
    'e752c8cf-fb29-45cb-a820-3a22df163f35',
    'sym.sweyeemon@gmail.com',
    true,
    'Full-time teaching operations administrator; company finance access prohibited (2026-08-16)',
    CURRENT_TIMESTAMP
)
ON CONFLICT ("email") DO UPDATE SET
    "isActive" = EXCLUDED."isActive",
    "note" = EXCLUDED."note",
    "updatedAt" = CURRENT_TIMESTAMP;

-- Force a fresh signed web session so the route firewall is active immediately.
DELETE FROM "AuthSession"
WHERE "userId" IN (
    SELECT "id" FROM "User" WHERE LOWER("email") = 'sym.sweyeemon@gmail.com'
);
