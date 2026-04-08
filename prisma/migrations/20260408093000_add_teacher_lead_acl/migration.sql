CREATE TABLE "TeacherLeadAcl" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherLeadAcl_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TeacherLeadAcl_email_key" ON "TeacherLeadAcl"("email");
