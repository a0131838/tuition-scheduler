import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const migrationPath = path.join(process.cwd(), "prisma/migrations/20260803193000_add_monthly_scheduling_campaign/migration.sql");
const offerMigrationPath = path.join(process.cwd(), "prisma/migrations/20260804123000_add_monthly_scheduling_offers/migration.sql");
const proxyAuditMigrationPath = path.join(process.cwd(), "prisma/migrations/20260804183000_add_monthly_scheduling_proxy_audit/migration.sql");
const familyEfficiencyMigrationPath = path.join(process.cwd(), "prisma/migrations/20260804233000_add_monthly_scheduling_family_efficiency/migration.sql");

test("monthly scheduling migration is additive and keeps existing operational tables untouched", () => {
  const sql = fs.readFileSync(migrationPath, "utf8");
  assert.match(sql, /CREATE TABLE "MonthlySchedulingCampaign"/);
  assert.match(sql, /CREATE TABLE "MonthlySchedulingItem"/);
  assert.match(sql, /MonthlySchedulingItem_campaignId_studentId_courseId_key/);
  assert.match(sql, /REFERENCES "Student"\("id"\)/);
  assert.match(sql, /REFERENCES "CoursePackage"\("id"\) ON DELETE SET NULL/);
  assert.doesNotMatch(sql, /DROP TABLE|DROP COLUMN|TRUNCATE|DELETE FROM|UPDATE "(?:CoursePackage|Attendance|Session|Ticket)"/i);
});

test("monthly scheduling offer migration is additive and isolated", () => {
  const sql = fs.readFileSync(offerMigrationPath, "utf8");
  assert.match(sql, /CREATE TABLE "MonthlySchedulingOffer"/);
  assert.match(sql, /MonthlySchedulingOffer_teacherId_status_holdExpiresAt_idx/);
  assert.match(sql, /REFERENCES "MonthlySchedulingItem"\("id"\) ON DELETE CASCADE/);
  assert.doesNotMatch(sql, /DROP TABLE|DROP COLUMN|TRUNCATE|DELETE FROM|UPDATE "(?:CoursePackage|Attendance|Session|Ticket)"/i);
});

test("staff proxy audit migration is additive and does not rewrite scheduling or finance data", () => {
  const sql = fs.readFileSync(proxyAuditMigrationPath, "utf8");
  assert.match(sql, /ADD COLUMN "responseEntryMode" TEXT/);
  assert.match(sql, /ADD COLUMN "parentConfirmationNote" TEXT/);
  assert.match(sql, /ADD COLUMN "offerSelectionEntryMode" TEXT/);
  assert.match(sql, /MonthlySchedulingItem_responseEntryMode_updatedAt_idx/);
  assert.doesNotMatch(sql, /DROP TABLE|DROP COLUMN|TRUNCATE|DELETE FROM|UPDATE "(?:CoursePackage|Attendance|Session|Ticket)"/i);
});

test("family scheduling efficiency migration is additive only", () => {
  const sql = fs.readFileSync(familyEfficiencyMigrationPath, "utf8");
  assert.match(sql, /ADD COLUMN "carryForwardScheduleJson" JSONB/);
  assert.match(sql, /ADD COLUMN "familyDecisionBatchId" TEXT/);
  assert.match(sql, /ADD COLUMN "preferenceLevel" TEXT/);
  assert.match(sql, /MonthlySchedulingItem_familyDecisionBatchId_idx/);
  assert.doesNotMatch(sql, /DROP TABLE|DROP COLUMN|TRUNCATE|DELETE FROM|UPDATE /i);
});
