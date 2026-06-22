-- CreateEnum
CREATE TYPE "StudentContractMode" AS ENUM (
  'TUITION_AGREEMENT',
  'SSG_STANDARD_PEI_V4'
);

-- AlterTable
ALTER TABLE "StudentContract"
ADD COLUMN "contractMode" "StudentContractMode" NOT NULL DEFAULT 'TUITION_AGREEMENT';
