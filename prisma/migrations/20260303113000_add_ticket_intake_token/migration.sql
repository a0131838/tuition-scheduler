CREATE TABLE "TicketIntakeToken" (
  "id" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "label" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "expiresAt" TIMESTAMP(3),

  CONSTRAINT "TicketIntakeToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TicketIntakeToken_token_key" ON "TicketIntakeToken"("token");
CREATE INDEX "TicketIntakeToken_isActive_createdAt_idx" ON "TicketIntakeToken"("isActive", "createdAt");

ALTER TABLE "TicketIntakeToken"
  ADD CONSTRAINT "TicketIntakeToken_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
