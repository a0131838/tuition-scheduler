CREATE TABLE "TeacherEmploymentTerm" (
  "id" TEXT NOT NULL,
  "teacherId" TEXT NOT NULL,
  "employmentType" TEXT NOT NULL DEFAULT 'PART_TIME',
  "lessonPayMode" TEXT NOT NULL DEFAULT 'SEPARATELY_PAYABLE',
  "effectiveFrom" TIMESTAMP(3) NOT NULL,
  "effectiveTo" TIMESTAMP(3),
  "note" TEXT,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TeacherEmploymentTerm_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TeacherPayrollSessionOverride" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "teacherId" TEXT NOT NULL,
  "payMode" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TeacherPayrollSessionOverride_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TeacherPayrollNote" (
  "id" TEXT NOT NULL,
  "teacherId" TEXT NOT NULL,
  "month" TEXT NOT NULL,
  "note" TEXT NOT NULL,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TeacherPayrollNote_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TeacherEmploymentTerm_teacherId_effectiveFrom_idx"
  ON "TeacherEmploymentTerm"("teacherId", "effectiveFrom");
CREATE INDEX "TeacherEmploymentTerm_teacherId_effectiveTo_idx"
  ON "TeacherEmploymentTerm"("teacherId", "effectiveTo");
CREATE UNIQUE INDEX "TeacherPayrollSessionOverride_sessionId_key"
  ON "TeacherPayrollSessionOverride"("sessionId");
CREATE INDEX "TeacherPayrollSessionOverride_teacherId_updatedAt_idx"
  ON "TeacherPayrollSessionOverride"("teacherId", "updatedAt");
CREATE UNIQUE INDEX "TeacherPayrollNote_teacherId_month_key"
  ON "TeacherPayrollNote"("teacherId", "month");
CREATE INDEX "TeacherPayrollNote_month_updatedAt_idx"
  ON "TeacherPayrollNote"("month", "updatedAt");

ALTER TABLE "TeacherEmploymentTerm"
  ADD CONSTRAINT "TeacherEmploymentTerm_teacherId_fkey"
  FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeacherPayrollSessionOverride"
  ADD CONSTRAINT "TeacherPayrollSessionOverride_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeacherPayrollSessionOverride"
  ADD CONSTRAINT "TeacherPayrollSessionOverride_teacherId_fkey"
  FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeacherPayrollNote"
  ADD CONSTRAINT "TeacherPayrollNote_teacherId_fkey"
  FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "TeacherEmploymentTerm" (
  "id", "teacherId", "employmentType", "lessonPayMode", "effectiveFrom", "note", "createdBy"
)
SELECT
  'f0000000-0000-4000-8000-000000000001',
  "id",
  'FULL_TIME',
  'INCLUDED_IN_SALARY',
  TIMESTAMP '2026-08-09 16:00:00',
  'Full-time employee from 10 Aug 2026; standard lessons are included in monthly salary.',
  'system:migration-20260817-full-time-payroll'
FROM "Teacher"
WHERE "id" = '66c22126-ae26-42b0-bbcf-ac3578a555ca'
  AND NOT EXISTS (
    SELECT 1 FROM "TeacherEmploymentTerm"
    WHERE "teacherId" = '66c22126-ae26-42b0-bbcf-ac3578a555ca'
      AND "effectiveFrom" = TIMESTAMP '2026-08-09 16:00:00'
  );

INSERT INTO "TeacherEmploymentTerm" (
  "id", "teacherId", "employmentType", "lessonPayMode", "effectiveFrom", "note", "createdBy"
)
SELECT
  'f0000000-0000-4000-8000-000000000002',
  "id",
  'FULL_TIME',
  'INCLUDED_IN_SALARY',
  TIMESTAMP '2026-05-31 16:00:00',
  'Full-time employee from 1 Jun 2026; standard lessons are included in monthly salary.',
  'system:migration-20260817-full-time-payroll'
FROM "Teacher"
WHERE "id" = 'aad58934-c4b3-4e30-b207-e7026af12f22'
  AND NOT EXISTS (
    SELECT 1 FROM "TeacherEmploymentTerm"
    WHERE "teacherId" = 'aad58934-c4b3-4e30-b207-e7026af12f22'
      AND "effectiveFrom" = TIMESTAMP '2026-05-31 16:00:00'
  );

INSERT INTO "TeacherEmploymentTerm" (
  "id", "teacherId", "employmentType", "lessonPayMode", "effectiveFrom", "note", "createdBy"
)
SELECT
  'f0000000-0000-4000-8000-000000000003',
  "id",
  'FULL_TIME',
  'INCLUDED_IN_SALARY',
  TIMESTAMP '2026-05-31 16:00:00',
  'Full-time employee from 1 Jun 2026; standard lessons are included in monthly salary.',
  'system:migration-20260817-full-time-payroll'
FROM "Teacher"
WHERE "id" = 'c52362c1-97f9-4e49-a525-48c46d4a8289'
  AND NOT EXISTS (
    SELECT 1 FROM "TeacherEmploymentTerm"
    WHERE "teacherId" = 'c52362c1-97f9-4e49-a525-48c46d4a8289'
      AND "effectiveFrom" = TIMESTAMP '2026-05-31 16:00:00'
  );

INSERT INTO "TeacherPayrollNote" ("id", "teacherId", "month", "note", "createdBy")
SELECT
  'f1000000-0000-4000-8000-000000000001',
  "id",
  '2026-08',
  'Full-time employee from 10 Aug 2026. Standard lessons on and after this date are included in monthly salary and are not separately payable.',
  'system:migration-20260817-full-time-payroll'
FROM "Teacher"
WHERE "id" = '66c22126-ae26-42b0-bbcf-ac3578a555ca'
  AND NOT EXISTS (
    SELECT 1 FROM "TeacherPayrollNote"
    WHERE "teacherId" = '66c22126-ae26-42b0-bbcf-ac3578a555ca' AND "month" = '2026-08'
  );

INSERT INTO "TeacherPayrollNote" ("id", "teacherId", "month", "note", "createdBy")
SELECT
  'f1000000-0000-4000-8000-000000000002',
  "id",
  '2026-08',
  'Full-time employee from 1 Jun 2026. Standard lessons in this payroll period are included in monthly salary and are not separately payable.',
  'system:migration-20260817-full-time-payroll'
FROM "Teacher"
WHERE "id" = 'aad58934-c4b3-4e30-b207-e7026af12f22'
  AND NOT EXISTS (
    SELECT 1 FROM "TeacherPayrollNote"
    WHERE "teacherId" = 'aad58934-c4b3-4e30-b207-e7026af12f22' AND "month" = '2026-08'
  );

INSERT INTO "TeacherPayrollNote" ("id", "teacherId", "month", "note", "createdBy")
SELECT
  'f1000000-0000-4000-8000-000000000003',
  "id",
  '2026-08',
  'Full-time employee from 1 Jun 2026. Standard lessons in this payroll period are included in monthly salary and are not separately payable.',
  'system:migration-20260817-full-time-payroll'
FROM "Teacher"
WHERE "id" = 'c52362c1-97f9-4e49-a525-48c46d4a8289'
  AND NOT EXISTS (
    SELECT 1 FROM "TeacherPayrollNote"
    WHERE "teacherId" = 'c52362c1-97f9-4e49-a525-48c46d4a8289' AND "month" = '2026-08'
  );
