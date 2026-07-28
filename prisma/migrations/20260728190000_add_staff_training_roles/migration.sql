CREATE TABLE "StaffTrainingRole" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffTrainingRole_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StaffTrainingRole_userId_role_key"
ON "StaffTrainingRole"("userId", "role");

CREATE INDEX "StaffTrainingRole_role_isActive_idx"
ON "StaffTrainingRole"("role", "isActive");

ALTER TABLE "StaffTrainingRole"
ADD CONSTRAINT "StaffTrainingRole_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
