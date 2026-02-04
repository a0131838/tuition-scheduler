-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "sourceChannelId" TEXT,
ADD COLUMN     "studentTypeId" TEXT;

-- CreateTable
CREATE TABLE "StudentSourceChannel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentSourceChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudentSourceChannel_name_key" ON "StudentSourceChannel"("name");

-- CreateIndex
CREATE UNIQUE INDEX "StudentType_name_key" ON "StudentType"("name");

-- CreateIndex
CREATE INDEX "Student_sourceChannelId_idx" ON "Student"("sourceChannelId");

-- CreateIndex
CREATE INDEX "Student_studentTypeId_idx" ON "Student"("studentTypeId");

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_sourceChannelId_fkey" FOREIGN KEY ("sourceChannelId") REFERENCES "StudentSourceChannel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_studentTypeId_fkey" FOREIGN KEY ("studentTypeId") REFERENCES "StudentType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
